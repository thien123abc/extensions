import React, { useEffect } from 'react';

export const useOutsideClick = (
  ref: React.RefObject<HTMLDivElement | null>,
  callback: () => void,
  exceptElementClass?: string,
): void => {
  useEffect(() => {
    function handleClickOutside(event: any) {
      const isToast = event.target.closest('.Toastify');
      const isExcept = exceptElementClass ? event.target.closest(`.${exceptElementClass}`) : false;
      if (ref.current && !ref.current.contains(event.target) && !isToast && !isExcept) {
        callback();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback, exceptElementClass]);
};
