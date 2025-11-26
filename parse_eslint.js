const fs = require('fs');
try {
    const content = fs.readFileSync('eslint_report.json', 'utf8');
    const results = JSON.parse(content);

    let output = '';
    let errorCount = 0;

    results.forEach(result => {
        if (result.errorCount > 0) {
            output += `\nFile: ${result.filePath}\n`;
            result.messages.forEach(msg => {
                if (msg.severity === 2) { // 2 is error
                    output += `  ${msg.line}:${msg.column} - ${msg.message} (${msg.ruleId})\n`;
                    errorCount++;
                }
            });
        }
    });

    output += `\nTotal Errors: ${errorCount}\n`;
    console.log(output);
} catch (e) {
    console.error('Failed to parse report:', e);
}
