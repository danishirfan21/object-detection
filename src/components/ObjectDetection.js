import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

const ObjectDetection = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageSrc, setImageSrc] = useState('');
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    setLoading(true);
    setError(null);
    const file = acceptedFiles[0];

    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      setLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result.split(',')[1];
      setImageSrc(reader.result);

      const img = new Image();
      img.src = reader.result;
      img.onload = async () => {
        setImageWidth(img.width);
        setImageHeight(img.height);
      };

      try {
        const response = await fetch(
          'https://api-inference.huggingface.co/models/facebook/detr-resnet-50',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_HF_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: base64data }),
          }
        );

        if (!response.ok) {
          const errorMessage = await response.json();
          throw new Error(
            errorMessage.error[0] || 'Failed to fetch results from the API'
          );
        }

        const responseData = await response.json();
        setResult(responseData);
      } catch (error) {
        console.error('Error uploading the file:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading the file.');
      setLoading(false);
    };

    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const scaleBoundingBox = (box) => {
    return {
      xmin: (box.xmin / imageWidth) * 100 + '%',
      ymin: (box.ymin / imageHeight) * 100 + '%',
      width: ((box.xmax - box.xmin) / imageWidth) * 100 + '%',
      height: ((box.ymax - box.ymin) / imageHeight) * 100 + '%',
    };
  };

  return (
    <div>
      <h1>Object Detection</h1>
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>Drag 'n' drop an image here, or click to select one</p>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {imageSrc && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={imageSrc}
            alt="Uploaded"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          {result &&
            result.map((item, index) => {
              const { xmin, ymin, width, height } = scaleBoundingBox(item.box);
              return (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    border: '2px solid red',
                    left: xmin,
                    top: ymin,
                    width: width,
                    height: height,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      background: 'red',
                      color: 'white',
                      padding: '2px 4px',
                    }}
                  >
                    {item.label} ({(item.score * 100).toFixed(2)}%)
                  </span>
                </div>
              );
            })}
        </div>
      )}
      {result && (
        <div>
          <h2>Detection Results:</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ObjectDetection;
