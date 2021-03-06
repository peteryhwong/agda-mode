"use strict";
var path = require("path");
function parseFilepath(s) {
    if (s) {
        // remove newlines
        s = s.replace('\n', '');
        // sanitize with path.parse first
        var parsed = path.parse(s);
        // join it back and replace Windows' stupid backslash with slash
        var joined = path.join(parsed.dir, parsed.base).split(path.sep).join('/');
        // fuck Windows Bidi control character
        if (joined.charCodeAt(0) === 8234)
            joined = joined.substr(1);
        return joined.trim();
    }
    else {
        return '';
    }
}
exports.parseFilepath = parseFilepath;
function parseInputContent(data) {
    var expr = data.toString()
        .replace(/\\/g, '\\\\')
        .replace(/\\/g, '\\\\') // \           => \\
        .replace(/\"/g, '\\"') // "           => \"
        .replace(/\n/g, '\\n'); // newline     => \\n
    // trim spaces
    if (atom.config.get('agda-mode.trimSpaces'))
        return expr.trim();
    else
        return expr;
}
exports.parseInputContent = parseInputContent;
//# sourceMappingURL=util.js.map