import { FileText, FileSpreadsheet, Presentation, File } from "lucide-react";

interface FileIconProps {
  type: string;
  className?: string;
}

export const FileIcon = ({ type, className = "h-5 w-5" }: FileIconProps) => {
  const getIconAndColor = () => {
    // Documents (blue)
    if (type.includes('document') || type.includes('word') || type === 'application/msword' || 
        type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return { Icon: FileText, color: 'text-blue-500' };
    }
    
    // Spreadsheets (green)
    if (type.includes('spreadsheet') || type.includes('sheet') || type.includes('excel') ||
        type === 'application/vnd.ms-excel' || 
        type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return { Icon: FileSpreadsheet, color: 'text-green-500' };
    }
    
    // Presentations (yellow/orange)
    if (type.includes('presentation') || type.includes('powerpoint') || type.includes('slides') ||
        type === 'application/vnd.ms-powerpoint' || 
        type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return { Icon: Presentation, color: 'text-yellow-600' };
    }
    
    // PDF (blue)
    if (type === 'application/pdf') {
      return { Icon: FileText, color: 'text-blue-500' };
    }
    
    // Default (gray)
    return { Icon: File, color: 'text-muted-foreground' };
  };

  const { Icon, color } = getIconAndColor();
  
  return <Icon className={`${className} ${color}`} />;
};
