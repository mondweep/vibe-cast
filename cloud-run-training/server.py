import os
import subprocess
import shutil
import zipfile
from flask import Flask, request, jsonify
from google.cloud import storage

app = Flask(__name__)

# Initialize GCS Client
# Note: In Cloud Run, this uses the service account automatically
try:
    storage_client = storage.Client()
except:
    print("Warning: Could not init GCS client (local mode?)")

def download_gcs_file(gcs_uri, local_path):
    """Downloads a single file from GCS."""
    parts = gcs_uri.replace("gs://", "").split("/")
    bucket_name = parts[0]
    blob_name = "/".join(parts[1:])
    
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.download_to_filename(local_path)

def upload_file_to_gcs(local_path, gcs_uri):
    """Uploads a single file to GCS."""
    parts = gcs_uri.replace("gs://", "").split("/")
    bucket_name = parts[0]
    blob_name = "/".join(parts[1:])
    
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(local_path)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "gpu": check_gpu()})

def check_gpu():
    try:
        return subprocess.check_output(["nvidia-smi"]).decode('utf-8')
    except:
        return "No GPU detected"

@app.route('/train', methods=['POST'])
def train_endpoint():
    try:
        data = request.json
        dataset_url = data['dataset_url'] # gs://bucket/data.zip
        output_url = data['output_url']   # gs://bucket/model.zip
        model_name = data.get('model_name', 'my_model')
        epochs = int(data.get('epochs', 50))
        
        print(f"Starting training for {model_name} ({epochs} epochs)")
        
        # 1. Prepare Data
        dataset_zip = "dataset.zip"
        dataset_dir = "dataset"
        
        if os.path.exists(dataset_dir):
            shutil.rmtree(dataset_dir)
        os.makedirs(dataset_dir)
        
        print(f"Downloading dataset from {dataset_url}...")
        download_gcs_file(dataset_url, dataset_zip)
        
        with zipfile.ZipFile(dataset_zip, 'r') as zip_ref:
            zip_ref.extractall(dataset_dir)
        
        # 2. Run RVC Pipeline
        # We assume the RVC scripts are in the current working directory (/app)
        
        # Create logs directory explicitly (required by preprocess.py)
        logs_dir = f"logs/{model_name}"
        os.makedirs(logs_dir, exist_ok=True)

        # Step A: Preprocess
        print("Step A: Preprocessing...")
        # Args: inp_root, sr, n_p, exp_dir, noparallel, per
        cmd_preprocess = [
            "python3", "infer/modules/train/preprocess.py",
            dataset_dir, "40000", "1", f"logs/{model_name}", "True", "3.0"
        ]
        subprocess.check_call(cmd_preprocess)
        
        # Step B: Extract Features
        print("Step B: Extracting Features...")
        # Args: device, n_part, i_part, exp_dir, version, is_half
        cmd_extract = [
            "python3", "infer/modules/train/extract_feature_print.py",
            "cuda:0", "1", "0", f"logs/{model_name}", "v2", "True"
        ]
        subprocess.check_call(cmd_extract)
        
        # Step C: Train
        print("Step C: Training...")
        # Note: Arguments might vary based on RVC version. This is for v2.
        cmd_train = [
            "python3", "infer/modules/train/train.py",
            "-e", model_name,
            "-sr", "40k",
            "-f0", "1",
            "-bs", "8",
            "-te", str(epochs),
            "-se", "5",
            "-pg", "assets/pretrained_v2/f0G40k.pth",
            "-pd", "assets/pretrained_v2/f0D40k.pth",
            "-l", "1",
            "-c", "0",
            "-sw", "0",
            "-v", "v2"
        ]
        subprocess.check_call(cmd_train)
        
        # 3. Package Results
        print("Packaging results...")
        result_zip = f"{model_name}_result.zip"
        
        # We want to zip the weights and the index file
        with zipfile.ZipFile(result_zip, 'w') as zipf:
            # Add .pth
            pth_path = f"assets/weights/{model_name}.pth"
            if os.path.exists(pth_path):
                zipf.write(pth_path, arcname=f"{model_name}.pth")
            
            # Add index
            logs_dir = f"logs/{model_name}"
            for f in os.listdir(logs_dir):
                if f.startswith("added_") and f.endswith(".index"):
                    zipf.write(os.path.join(logs_dir, f), arcname=f)
        
        # 4. Upload
        print(f"Uploading to {output_url}...")
        upload_file_to_gcs(result_zip, output_url)
        
        return jsonify({"status": "success", "message": "Training complete", "output": output_url})
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
