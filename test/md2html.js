const md = require('../src/index.js')
const {encode} = require('ic-xentity')

const at = (a,b) => (b = Object.keys(a)).length && (' ' + b.map(b => a[b] != null ? b + '="' + encode(a[b].toString()) + '"' : '').filter(a => a).join(' ')) || ''
const md_parse = (a, op) => {
	if(!op) op = {}
	return a.map(a => {
		if(!a || typeof a == 'string') return encode(a || '')
		if(a.t == 'br' || a.t == 'hr') return `<${a.t}/>`
		if(a.t == 'code') return `<code>${encode(a.ch)}</code>`
		if(a.t == 'codeblock') return `<pre><code>${encode(a.ch)}</code></pre>`
		if(a.t == 'img') return `<img${at({src: a.url, alt: a.ch || null, title: a.alt || null})}/>`

		if(a.t == 'ul' || a.t == 'ol' || a.t == 'cl') {
			a.ch = a.ch.map(a => {
				a.a = md_parse(a.a, op)
				a.b = md_parse(a.b, op)
				return a
			})
			var t = {cl: a.t == 'cl', ex: a.ch.some(a => a.b.length > 0)}
			a.ch = a.ch.map(a => {
				if(t.cl) a.a = `<label><input${at(Object.assign({type: 'checkbox', disabled: '', value: ''}, a.v ? {checked: ''} : {}))}/>${a.a}</label>`
				if(t.ex) a.a += `<br/><p>${a.b}</p>`
				return `<li>${a.a}</li>`
			})
			if(t.cl) a.t = 'ul'
			return `<${a.t}>${a.ch.join('')}</${a.t}>`
		}
		if(a.t == 'table') {
			a.ch = a.ch.map((a, i) => `<tr>${(i = i ? 'td' : 'th') && a.map(a => `<${i}>${md_parse(a, op)}</${i}>`).join('')}</tr>`)
			a.ch = `<thead>${a.ch[0]}</thead><tbody>${a.ch.slice(1).join('')}<tbody>`
			return `<${a.t}>${a.ch}</${a.t}>`
		}

		if(a.ch instanceof Array) a.ch = md_parse(a.ch, op)
		if(a.t == 'link') return `<a${at({href: a.url, alt: a.alt || null})}>${a.ch}</a>`
		if(a.t && a.t.match(/^h[1-6]$/) || ['p', 'blockquote', 'codeblock', 'code', 'a', 'b', 'i', 's'].indexOf(a.t) >= 0) return `<${a.t}>${a.ch}</${a.t}>`
		if(op.error) throw new Error('unable to render')
		console.error('unable to render', a)
		return '<h1 style="color:red">unable to render</h1>'
		return a
	}).join('')
}
const X = (a, op) => {
	if(!op) op = {}
	return md_parse(md.parse(a, op.parse || {}), op)
}
module.exports = X
