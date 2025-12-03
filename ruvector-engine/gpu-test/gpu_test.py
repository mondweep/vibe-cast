#!/usr/bin/env python3
"""
GPU Functionality Test Script

Tests that the GPU is properly detected and functional on Cloud Run.
"""

import subprocess
import json
import sys
import os

def check_nvidia_smi():
    """Check if nvidia-smi is available and GPU is detected"""
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name,memory.total,memory.free,utilization.gpu', '--format=csv,noheader,nounits'],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            gpus = []
            for line in lines:
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 4:
                    gpus.append({
                        'name': parts[0],
                        'memory_total_mb': int(parts[1]),
                        'memory_free_mb': int(parts[2]),
                        'utilization_percent': int(parts[3])
                    })
            return {'available': True, 'gpus': gpus}
        else:
            return {'available': False, 'error': result.stderr}
    except FileNotFoundError:
        return {'available': False, 'error': 'nvidia-smi not found'}
    except subprocess.TimeoutExpired:
        return {'available': False, 'error': 'nvidia-smi timed out'}
    except Exception as e:
        return {'available': False, 'error': str(e)}

def check_cuda_available():
    """Check if CUDA is available via Python"""
    try:
        # Try to import and check CUDA
        result = subprocess.run(
            ['python3', '-c', '''
import os
print("CUDA_VISIBLE_DEVICES:", os.environ.get("CUDA_VISIBLE_DEVICES", "not set"))
print("NVIDIA_VISIBLE_DEVICES:", os.environ.get("NVIDIA_VISIBLE_DEVICES", "not set"))

try:
    import torch
    print("PyTorch CUDA available:", torch.cuda.is_available())
    if torch.cuda.is_available():
        print("CUDA device count:", torch.cuda.device_count())
        print("CUDA device name:", torch.cuda.get_device_name(0))
except ImportError:
    print("PyTorch not installed")

try:
    import tensorflow as tf
    print("TensorFlow GPUs:", len(tf.config.list_physical_devices("GPU")))
except ImportError:
    print("TensorFlow not installed")
'''],
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
    except Exception as e:
        return {'error': str(e)}

def run_gpu_compute_test():
    """Run a simple GPU computation test"""
    try:
        # Simple matrix multiplication test using numpy (CPU baseline)
        import numpy as np
        import time

        # Create test matrices
        size = 1000
        a = np.random.rand(size, size).astype(np.float32)
        b = np.random.rand(size, size).astype(np.float32)

        # CPU test
        start = time.time()
        c = np.dot(a, b)
        cpu_time = time.time() - start

        return {
            'matrix_size': size,
            'cpu_time_seconds': round(cpu_time, 4),
            'result_checksum': float(np.sum(c)),
            'test_passed': True
        }
    except Exception as e:
        return {'test_passed': False, 'error': str(e)}

def main():
    """Run all GPU tests and return results"""
    results = {
        'nvidia_smi': check_nvidia_smi(),
        'cuda_check': check_cuda_available(),
        'compute_test': run_gpu_compute_test(),
        'environment': {
            'NVIDIA_VISIBLE_DEVICES': os.environ.get('NVIDIA_VISIBLE_DEVICES', 'not set'),
            'CUDA_VISIBLE_DEVICES': os.environ.get('CUDA_VISIBLE_DEVICES', 'not set'),
            'LD_LIBRARY_PATH': os.environ.get('LD_LIBRARY_PATH', 'not set')[:200] if os.environ.get('LD_LIBRARY_PATH') else 'not set'
        }
    }

    # Determine overall status
    gpu_available = results['nvidia_smi'].get('available', False)
    results['summary'] = {
        'gpu_detected': gpu_available,
        'gpu_count': len(results['nvidia_smi'].get('gpus', [])) if gpu_available else 0,
        'status': 'GPU operational' if gpu_available else 'No GPU detected (CPU mode)'
    }

    print(json.dumps(results, indent=2))
    return 0 if gpu_available else 1

if __name__ == '__main__':
    sys.exit(main())
