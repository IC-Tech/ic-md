const fs = require('fs')
const md2html = require('./md2html.js')

// lets hope that I didn't change the stylesheet link
var temp = (t, b) => `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8"/>
	<title>{title}</title>
	<link rel="stylesheet" type="text/css" href="https://ic-tech.github.io/styles/index.css">
</head>
<body id="root" class="doc">{body}</body>
</html>
`.replace('{title}', t || '').replace('{body}', b || '')

const custom_match = (name, data) => {
	if(name == 'red') return true
	if(name == 'green') return true
	if(name == 'blue') return true
	if(/^img[\d]*$/.test(name)) return true
	if(name == 'video') return true
}
const custom_html = (name, data) => {
	if(name == 'red') return `<span style="color:red">${data}</span>`
	if(name == 'green') return `<span style="color:green">${data}</span>`
	if(name == 'blue') return `<span style="color:blue">${data}</span>`
	if(/^img[\d]*$/.test(name)) {
		var w = name.substr(3)
		w = parseInt(w)
		if(w) return `<img width="${w}px" src="${data}"/>`
		return `<img src="${data}"/>`
	}
	if(name = 'video') return `<video src="${data}" controls="" width="640"></video>`
}

const a = a => {
	var b = fs.readFileSync(a).toString()
	b = md2html(b, {
		error: true,
		parse: {
			hashtag: 1,
			mention: 1,
			custom: custom_match
		},
		custom: custom_html
	})
	b = temp(a, b)
	fs.writeFileSync(a + '.html', b)
}

a('test/sample-0.md')
a('test/sample-1.md')
a('test/sample-2.md')

console.log('done')
