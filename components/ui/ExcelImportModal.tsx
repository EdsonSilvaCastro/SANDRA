
import React, { useState, useRef } from 'react';
import Modal from './Modal';
import * as XLSX from 'xlsx';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
  title: string;
  expectedColumns: string[];
  templateFileName?: string;
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ 
  isOpen, 
  onClose, 
  onImport, 
  title, 
  expectedColumns,
  templateFileName = 'plantilla_importacion.xlsx'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileData, setFileData] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError('');
    setSuccessMessage('');
    setFileData([]);
    
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          if (data.length === 0) {
              setError("El archivo parece estar vacío.");
              return;
          }

          // Basic validation check based on first row
          const firstRow = data[0] as object;
          const headers = Object.keys(firstRow);
          const missingColumns = expectedColumns.filter(col => !headers.includes(col));
          
          if (missingColumns.length > 0) {
              setError(`Faltan columnas requeridas: ${missingColumns.join(', ')}`);
          } else {
              setFileData(data);
          }
        } catch (err) {
          setError("Error al leer el archivo. Asegúrese de que sea un Excel válido (.xlsx, .xls).");
          console.error(err);
        }
      };
      
      reader.readAsBinaryString(file);
    }
  };

  const handleImportClick = async () => {
      if (fileData.length === 0) return;
      
      setIsProcessing(true);
      try {
          await onImport(fileData);
          setSuccessMessage(`Se han importado ${fileData.length} registros exitosamente.`);
          setFileData([]);
          setFileName('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          setTimeout(() => {
              onClose();
              setSuccessMessage('');
          }, 1500);
      } catch (err: any) {
          setError(`Error al importar datos: ${err.message || 'Error desconocido'}`);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDownloadTemplate = () => {
      // Create a dummy row with expected columns
      const row: Record<string, string> = {};
      expectedColumns.forEach(col => row[col] = '');
      
      const ws = XLSX.utils.json_to_sheet([row]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
      XLSX.writeFile(wb, templateFileName);
  };

  const handleReset = () => {
      setFileName('');
      setFileData([]);
      setError('');
      setSuccessMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { handleReset(); onClose(); }} title={title}>
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800">
            <p className="font-semibold mb-2">Instrucciones:</p>
            <ul className="list-disc list-inside space-y-1">
                <li>El archivo debe ser formato Excel (.xlsx o .xls).</li>
                <li>La primera fila debe contener exactamente los nombres de las columnas requeridas.</li>
                <li>Puedes descargar una plantilla vacía para comenzar.</li>
            </ul>
        </div>

        <div>
            <p className="text-sm font-medium text-black mb-2">Columnas Requeridas:</p>
            <div className="flex flex-wrap gap-2">
                {expectedColumns.map(col => (
                    <span key={col} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-md font-mono">
                        {col}
                    </span>
                ))}
            </div>
        </div>

        <div className="flex justify-between items-center border-t pt-4">
             <button 
                onClick={handleDownloadTemplate}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center gap-1"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Descargar Plantilla
             </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
            {!fileName ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-gray-500 mb-2">Arrastra tu archivo aquí o</p>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-1 bg-white border border-gray-300 text-black rounded-md hover:bg-gray-100 text-sm font-medium"
                    >
                        Seleccionar Archivo
                    </button>
                </>
            ) : (
                <div className="flex items-center justify-between bg-green-50 p-3 rounded border border-green-200">
                    <div className="flex items-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         <span className="text-green-800 font-medium truncate max-w-[200px]">{fileName}</span>
                    </div>
                    <button onClick={handleReset} className="text-gray-500 hover:text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            )}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx, .xls" 
                className="hidden" 
            />
        </div>

        {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded">{error}</p>}
        {successMessage && <p className="text-green-600 text-sm font-medium bg-green-50 p-2 rounded">{successMessage}</p>}

        <div className="flex justify-end pt-4">
            <button 
                onClick={handleImportClick}
                disabled={!fileName || !!error || isProcessing || fileData.length === 0}
                className="w-full py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
                {isProcessing ? 'Procesando...' : `Importar ${fileData.length > 0 ? `(${fileData.length})` : ''}`}
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExcelImportModal;
