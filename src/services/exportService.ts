import * as XLSX from 'xlsx';
import { MetroData } from '../types';

export function exportToCSV(data: MetroData[], filename: string = 'metro_data.csv') {
  const formattedData = data.map(item => ({
    '日期': item.date,
    '城市': item.city,
    '客运量(万人)': item.passenger_volume
  }));
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportToExcel(data: MetroData[], filename: string = 'metro_data.xlsx') {
  const formattedData = data.map(item => ({
    '日期': item.date,
    '城市': item.city,
    '客运量(万人)': item.passenger_volume
  }));
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Metro Data');
  XLSX.writeFile(workbook, filename);
}
