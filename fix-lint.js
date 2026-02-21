/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const fs = require('fs');

function replaceFile(path, oldStr, newStr) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    content = content.split(oldStr).join(newStr);
    fs.writeFileSync(path, content);
}

function replaceRegex(path, regex, newStr) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(regex, newStr);
    fs.writeFileSync(path, content);
}

// 1. app/share/[token]/page.tsx
replaceRegex('app/share/[token]/page.tsx', /<a href="\/"/g, '<Link href="/"');
replaceRegex('app/share/[token]/page.tsx', /<\/a>/g, '</Link>');

// 2. app/admin/pricing/page.tsx
replaceRegex('app/admin/pricing/page.tsx', /"Max File Size \(MB\)"/g, "&quot;Max File Size (MB)&quot;");
replaceRegex('app/admin/pricing/page.tsx', /"\'s"/g, "&apos;s");
replaceRegex('app/admin/pricing/page.tsx', /'Free'/g, "&apos;Free&apos;");

// 3. components/drops/share-dialog.tsx
replaceRegex('components/drops/share-dialog.tsx', /"Copy link"/g, "&quot;Copy link&quot;");
replaceRegex('components/drops/share-dialog.tsx', /"Copied!"/g, "&quot;Copied!&quot;");

// 4. lib/payment-gateway.ts
replaceRegex('lib/payment-gateway.ts', /mode: 'PAYMENT_LINK' \| 'API'/g, "mode: string");
replaceRegex('lib/payment-gateway.ts', /mode: 'PAYMENT_LINK' \| 'API';/g, "mode: string;");

console.log("Fixes applied");
