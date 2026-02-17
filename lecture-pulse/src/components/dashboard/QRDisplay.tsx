import { QRCodeSVG } from "qrcode.react";

interface QRDisplayProps {
  url: string;
  roomCode: string;
}

export default function QRDisplay({ url, roomCode }: QRDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/5 p-4">
      <h3 className="text-lg font-semibold uppercase tracking-wider text-slate-400">
        Scan to Join
      </h3>

      <div className="rounded-xl bg-white p-3">
        <QRCodeSVG
          value={url}
          size={160}
          bgColor="#ffffff"
          fgColor="#1a1a2e"
          level="M"
          includeMargin={false}
        />
      </div>

      <p className="mt-1 font-mono text-4xl font-black tracking-[0.3em] text-white">
        {roomCode}
      </p>

      <p className="max-w-[220px] truncate text-center text-xs text-slate-500">
        {url}
      </p>
    </div>
  );
}
