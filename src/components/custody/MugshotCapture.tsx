import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle2, Shield, Trash2 } from 'lucide-react';
import type { Mugshot } from '@/types';
import { watermarkAndStripExif } from '@/lib/crypto';

interface MugshotCaptureProps {
  stationCode: string;
  officerServiceNo: string;
  mugshots: Mugshot[];
  onChange: (updatedMugshots: Mugshot[]) => void;
}

type Angle = 'FRONT' | 'LEFT' | 'RIGHT' | 'DISTINGUISHING_MARK';

const REQUIRED_ANGLES: { angle: Angle; label: string; desc: string }[] = [
  { angle: 'FRONT', label: 'Frontal Portrait', desc: 'Direct eye level, neutral expression' },
  { angle: 'LEFT', label: 'Left Profile (90°)', desc: 'Full 90-degree left profile view' },
  { angle: 'RIGHT', label: 'Right Profile (90°)', desc: 'Full 90-degree right profile view' },
  { angle: 'DISTINGUISHING_MARK', label: 'Distinguishing Marks', desc: 'Tattoos, scars, amputations (optional)' },
];

export function MugshotCapture({
  stationCode,
  officerServiceNo,
  mugshots,
  onChange,
}: MugshotCaptureProps) {
  const [activeAngle, setActiveAngle] = useState<Angle>('FRONT');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start live webcam stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Webcam access error:', err);
      setCameraError('Camera unavailable or permission denied. Please use direct file upload.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Capture from live stream
  const handleCapturePhoto = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 800;
      canvas.height = videoRef.current.videoHeight || 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Watermark and strip EXIF
      const { dataUrl, sha256Hash } = await watermarkAndStripExif(
        rawDataUrl,
        stationCode,
        officerServiceNo,
        activeAngle
      );

      const newMugshot: Mugshot = {
        id: crypto.randomUUID(),
        person_id: 'pending',
        station_id: 'a0000000-0000-0000-0000-000000000001',
        view_angle: activeAngle,
        image_data_url: dataUrl,
        sha256_hash: sha256Hash,
        exif_stripped: true,
        taken_at: new Date().toISOString(),
        taken_by_service_no: officerServiceNo,
      };

      // Replace or add
      const filtered = mugshots.filter((m) => m.view_angle !== activeAngle);
      onChange([...filtered, newMugshot]);

      // Move to next angle automatically
      if (activeAngle === 'FRONT') setActiveAngle('LEFT');
      else if (activeAngle === 'LEFT') setActiveAngle('RIGHT');
    } catch (err: any) {
      setCameraError('Failed to capture photo: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload file fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const { dataUrl, sha256Hash } = await watermarkAndStripExif(
        file,
        stationCode,
        officerServiceNo,
        activeAngle
      );

      const newMugshot: Mugshot = {
        id: crypto.randomUUID(),
        person_id: 'pending',
        station_id: 'a0000000-0000-0000-0000-000000000001',
        view_angle: activeAngle,
        image_data_url: dataUrl,
        sha256_hash: sha256Hash,
        exif_stripped: true,
        taken_at: new Date().toISOString(),
        taken_by_service_no: officerServiceNo,
      };

      const filtered = mugshots.filter((m) => m.view_angle !== activeAngle);
      onChange([...filtered, newMugshot]);

      if (activeAngle === 'FRONT') setActiveAngle('LEFT');
      else if (activeAngle === 'LEFT') setActiveAngle('RIGHT');
    } catch (err: any) {
      setCameraError('Failed to process image: ' + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (angle: Angle) => {
    onChange(mugshots.filter((m) => m.view_angle !== angle));
  };

  const currentPhoto = mugshots.find((m) => m.view_angle === activeAngle);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Camera className="h-4 w-4 text-amber-400" />
            <span>3-Point Custody Mugshot Capture</span>
          </h4>
          <p className="text-[11px] text-slate-400">
            Kenya National Police Standard • Frontal, Left & Right 90° Profiles
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
            {mugshots.length}/3 Core Angles Captured
          </span>
        </div>
      </div>

      {/* Angle Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {REQUIRED_ANGLES.map((item) => {
          const isDone = mugshots.some((m) => m.view_angle === item.angle);
          const isSelected = activeAngle === item.angle;

          return (
            <button
              key={item.angle}
              type="button"
              onClick={() => setActiveAngle(item.angle)}
              className={`p-2.5 rounded-lg border text-left text-xs transition-all relative ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/15 text-amber-200 ring-1 ring-amber-500 font-bold'
                  : isDone
                  ? 'border-emerald-600/50 bg-emerald-950/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{item.label}</span>
                {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{item.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Viewport Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Camera / Image Preview Area */}
        <div className="md:col-span-8 relative aspect-4/3 rounded-lg bg-black border border-slate-800 overflow-hidden flex items-center justify-center">
          {currentPhoto ? (
            <div className="relative w-full h-full">
              <img
                src={currentPhoto.image_data_url}
                alt={activeAngle}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <span className="text-[10px] font-mono bg-black/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                  EXIF STRIPPED • WATERMARKED
                </span>
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(activeAngle)}
                  className="rounded bg-red-950/80 border border-red-800 p-1.5 text-red-300 hover:bg-red-900"
                  title="Delete and retake photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : isCameraActive ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {/* Overlay Face Alignment Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-64 border-2 border-dashed border-amber-400/60 rounded-full flex items-center justify-center">
                  <span className="text-[11px] font-mono text-amber-300/80 bg-black/60 px-2 py-0.5 rounded">
                    Align {activeAngle} View
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center space-y-3">
              <Camera className="h-10 w-10 text-slate-600 mx-auto" />
              <div className="text-xs text-slate-400">
                No image captured for <strong className="text-slate-200">{activeAngle}</strong>
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Start the live terminal camera stream or upload a digital photograph directly.
              </p>
            </div>
          )}
        </div>

        {/* Controls and Biometric Specifications */}
        <div className="md:col-span-4 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span>Article 49 Biometric Standard</span>
              </div>
              <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                <li>Zero EXIF geolocational metadata</li>
                <li>Station code watermark embedded</li>
                <li>Cryptographic SHA-256 seal</li>
                <li>Officer service number attached</li>
              </ul>
            </div>

            {cameraError && (
              <div className="rounded bg-amber-950/40 border border-amber-800/80 p-2.5 text-[11px] text-amber-300">
                {cameraError}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {isCameraActive ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition-colors shadow-lg disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  <span>{isProcessing ? 'Watermarking...' : `Capture ${activeAngle} Angle`}</span>
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                >
                  Close Camera
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition-colors shadow-md"
                >
                  <Camera className="h-4 w-4" />
                  <span>Start Camera Stream</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs text-slate-300 font-medium transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Image File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
