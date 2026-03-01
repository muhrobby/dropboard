const fs = require('fs');
const path = 'components/todos/task-detail-sheet.tsx';
let content = fs.readFileSync(path, 'utf8');

// remove lines 36 to 62 roughly where duplicate imports start, wait. Let's just sed it.
