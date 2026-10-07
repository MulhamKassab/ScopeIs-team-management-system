/** Valid PDF containing only explicitly fictional demonstration text. */
export function fictionalPdf(name,kind) {
  const lines=['ScopeIs - Fictional Company Demonstration',`${name} - ${kind.replaceAll('_',' ')}`,'This sample contains fictional professional information.','Use this document to explore authorized preview and download.','No certification, employment or capability claim is implied.'];
  const text=lines.map((line,i)=>`BT /F1 ${i===0?18:12} Tf 50 ${750-i*35} Td (${line.replace(/[\\()]/g,'\\$&')}) Tj ET`).join('\n');
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`];
  let body='%PDF-1.4\n';const offsets=[0];for(const [i,obj] of objects.entries()){offsets.push(Buffer.byteLength(body));body+=`${i+1} 0 obj\n${obj}\nendobj\n`;}
  const xref=Buffer.byteLength(body);body+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(x=>`${String(x).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return new Uint8Array(Buffer.from(body));
}
