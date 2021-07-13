const fs = require('fs')
const md2html = require('./md2html.js')

// lets hope that I didn't change the stylesheet link
var temp = (t, b) => `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>{title}</title>
	<link rel="stylesheet" type="text/css" href="https://ic-tech.github.io/styles/index.css">
</head>
<body id="root" class="doc">{body}</body>
</html>
`.replace('{title}', t || '').replace('{body}', b || '')
const a = a => {
	var b = fs.readFileSync(a).toString()
	b = md2html(b, {error: true, parse: {hashtag: 1, mention: 1}})
	b = temp(a, b)
	fs.writeFileSync(a + '.html', b)
}

a('test/sample-0.md')
a('test/sample-1.md')

console.log('done')
