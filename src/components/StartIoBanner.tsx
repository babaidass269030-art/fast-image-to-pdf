import React, { useEffect } from 'react';
import { initStartIo, showStartIoBanner, hideStartIoBanner, isNativeStartIoAvailable, START_IO_CONFIG } from '../utils/startIoBridge';

interface StartIoBannerProps {
  isVisible?: boolean;
}

export const StartIoBanner: React.FC<StartIoBannerProps> = ({ isVisible = true }) => {
  useEffect(() => {
    if (isVisible) {
      initStartIo();
      showStartIoBanner();
    } else {
      hideStartIoBanner();
    }

    return () => {
      hideStartIoBanner();
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const isNative = isNativeStartIoAvailable();

  return (
    <div
      id="startio-banner-container"
      data-startio-app-id={START_IO_CONFIG.appId}
      data-startio-test-mode={START_IO_CONFIG.testMode ? 'true' : 'false'}
      className="w-full flex items-center justify-center my-3 px-2 transition-opacity duration-300 pointer-events-auto"
      style={{ minHeight: isNative ? '50px' : '0px' }}
      aria-label="Start.io Banner Container"
    >
      {isNative ? (
        /* The native Android Start.io SDK Banner view attaches directly into this container */
        <div id="startio-native-ad-view" className="w-full max-w-[320px] h-[50px]" />
      ) : null}
    </div>
  );
};
