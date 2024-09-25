import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './ObjectDetection.css';

const ObjectDetection = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageSrc, setImageSrc] = useState('');
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [colors, setColors] = useState([]);

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

        const newColors = responseData.map(() => getRandomColor());
        setColors(newColors);
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

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const generateNewImage = () => {
    setResult(null);
    setImageSrc('');
    setImageWidth(0);
    setImageHeight(0);
    setColors([]);
  };

  return (
    <div className="object-detection-container">
      <div
        style={{
          backgroundColor: '#282c34',
          padding: '20px',
          borderRadius: '10px',
          color: 'white',
          marginBottom: '20px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '2.5em' }}>Object Detection</h1>
      </div>
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>Drag 'n' drop an image here, or click to select one</p>
      </div>
      {loading && <div className="spinner"></div>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {imageSrc && !loading && !error && (
        <div className="image-comparison-container">
          <div className="original-image">
            <h2>Original Image</h2>
            <img
              src={imageSrc}
              alt="Uploaded"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
          <div className="output-image">
            <h2>Output Image</h2>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={imageSrc}
                alt="Output"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              {result &&
                result.map((item, index) => {
                  const { xmin, ymin, width, height } = scaleBoundingBox(
                    item.box
                  );
                  const color = colors[index];
                  return (
                    <div
                      key={index}
                      style={{
                        position: 'absolute',
                        border: `2px solid ${color}`,
                        left: xmin,
                        top: ymin,
                        width: width,
                        height: height,
                        boxSizing: 'border-box',
                      }}
                    />
                  );
                })}
            </div>
          </div>
        </div>
      )}
      {!loading && !error && result && (
        <div
          style={{
            marginTop: '40px',
            textAlign: 'left',
            padding: '15px',
            border: '2px solid #ddd',
            borderRadius: '10px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
          }}
        >
          <h2
            style={{
              fontSize: '1.8em',
              color: '#333',
              textAlign: 'center',
              marginTop: 0,
            }}
          >
            {result && result.length === 1
              ? 'Detected Object'
              : 'Detected Objects'}
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            {result.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  marginBottom: '10px',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '30px',
                    height: '30px',
                    backgroundColor: colors[index],
                    marginRight: '8px',
                    borderRadius: '2px',
                  }}
                />
                <span style={{ fontWeight: 'bold', marginRight: '5px' }}>
                  {item.label}
                </span>
                <span style={{ color: '#555' }}>
                  ({(item.score * 100).toFixed(2)}%)
                </span>
                <div
                  style={{
                    flexGrow: 1,
                    height: '10px',
                    backgroundColor: colors[index],
                    marginLeft: '10px',
                    borderRadius: '5px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(item.score * 100).toFixed(2)}%`,
                      height: '100%',
                      backgroundColor: colors[index],
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectDetection;
