import { useEffect, useRef, useState } from 'react';
import { enviarRedacao } from '@/services/redacoes';
import { toast } from 'react-toastify';

function EnviarRedacaoModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState(0);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview('');
    }
  }, [file]);

  const handleStartCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Erro ao acessar câmera', err);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      setFile(blob);
    }, 'image/jpeg');
    stopCamera();
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleFileChange = e => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    try {
      await enviarRedacao(file, e => {
        if (e.total) {
          setProgress(Math.round((e.loaded * 100) / e.total));
        }
      });
      setFile(null);
      setProgress(0);
      onSuccess();
      toast.success('Redação enviada com sucesso');
    } catch (err) {
      console.error('Erro ao enviar redação', err);
      toast.error('Erro ao enviar redação');
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black/50'>
      <div
        className='ys-card w-full max-w-md p-md space-y-md'
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <h2 className='text-xl text-orange'>Enviar Redação</h2>
        <div className='space-y-sm'>
          <div className='flex space-x-sm'>
            <button
              type='button'
              className='px-4 py-2 border rounded'
              onClick={handleStartCamera}
            >
              Usar câmera
            </button>
            <input type='file' accept='image/*' onChange={handleFileChange} />
          </div>
          {stream && (
            <div className='space-y-sm'>
              <video ref={videoRef} autoPlay className='w-full' />
              <button
                type='button'
                className='ys-btn-primary'
                onClick={handleCapture}
              >
                Capturar
              </button>
            </div>
          )}
          <div className='border-dashed border-2 border-gray-300 p-md text-center'>
            Arraste e solte sua redação aqui
          </div>
          {preview && (
            <img
              src={preview}
              alt='Pré-visualização'
              className='w-full object-contain'
            />
          )}
          {progress > 0 && (
            <div className='w-full bg-lightGray rounded-full h-2'>
              <div
                className='bg-orange h-2 rounded-full'
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
        <div className='flex justify-end space-x-sm'>
          <button
            type='button'
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className='px-4 py-2 border rounded'
          >
            Cancelar
          </button>
          <button
            type='button'
            className='ys-btn-primary'
            onClick={handleUpload}
            disabled={!file}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnviarRedacaoModal;
