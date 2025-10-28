import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-50 print:static print:z-auto print:bg-transparent">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 print:shadow-none print:w-full print:max-w-full print:mx-0 print:rounded-none">
        <div className="flex justify-between items-center p-4 border-b no-print">
          <h2 className="text-xl font-semibold text-black">{title}</h2>
          <button onClick={onClose} className="text-black hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 print:p-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;