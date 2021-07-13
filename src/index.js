const {decode} = require('ic-xentity')
const backslash = '\\`*_{}[]<>()#+-.!|'
// removed thd '\x5F' ('_')
const mention_nochar = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F\x20\x21\x22\x23\x24\x25\x26\x27\x28\x29\x2A\x2B\x2C\x2D\x2E\x2F\x3A\x3B\x3C\x3D\x3E\x3F\x40\x5B\x5C\x5D\x5E\x60\x7B\x7C\x7D\x7E\x7F\x85\xA0\u115F\u1160\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u200B\u200C\u200D\u2012\u2013\u2014\u2015\u2018\u2019\u201B\u201C\u201D\u201E\u201F\u2028\u2029\u202F\u2032\u2033\u2034\u2035\u2036\u2037\u205F\u2060\u2800\u3000\u3164\uFEFF\uFFA0'
const mention_match = (a, op) => {
	var i = 0
	if('0123456789'.indexOf(a[0]) >= 0) return 0 // common thing
	for (; i < a.length; i++) if(mention_nochar.indexOf(a[i]) >= 0) break
	return i >= (typeof op.mention_min == 'number' ? op.mention_min : 3) ? i : 0
}
const hashtag_match = (a, op) => {
	var i = 0
	for (; i < a.length; i++) if(mention_nochar.indexOf(a[i]) >= 0) break
	return i >= (typeof op.hashtag_min == 'number' ? op.hashtag_min : 3) ? i : 0
}
const N = a => a !== 0 && a !== false
const M = a => a === 1 || a === true
const bs = a => {
	var b = ''
	for (var i = 0; i < a.length; i++) {
		if(a[i] == '\\' && backslash.indexOf(a[i + 1]) >= 0) i++
		b += a[i]
	}
	return b
}
const inlines = (a, op) => {
	op = Object.assign({auto_bi: 1}, op || {})
	const count = (a,b,c) => {
		var d = 0
		for (var i = c; i < a.length; i++) if(a[i] == b) d++; else break
		return d;
	},
	_url = (a, i) => {
		var c = 0
		for (; i < a.length; i++) {
			if(a[i] == '"' && a[i] != '\\') c++
			if(c == 2) c = 0
			if(!c && a[i] == ')' && a[i - 1] != '\\') return i
		}
		return 0
	},
	_alt = a => {
		try {
			var b = a.indexOf(' ')
			if(b == -1) return ''
			a = bs(a.substr(b + 1))
			return a[0] == '"' && JSON.parse(a) || a
		}
		catch (e) {}
		return bs(a)
	}
	var _d = {}, b = 0, c = 0, m = 0, l = [],
	def = i => {
		if(typeof l[l.length - 1] == 'string') l[l.length - 1] += a[i]
		else l.push(a[i])
	}
	for (var i = 0; i < a.length; i++) {
		if(a[i] == '\\' && backslash.indexOf(a[i + 1]) >= 0) {
			i++
			def(i)
			continue
		}
		if(a[i] == '*' && (N(op.bold) || N(op.italic))) {
			c = count(a, '*', i)
			if(c > 3) c = 3
			if(!(
				!N(op.bold) && (c == 3 || c == 2) ||
				!N(op.italic) && (c == 3 || c == 1)
			)) {
				var i1 = i + c, c1
				while(m = a.substr(i1).match(/(^|[^\\*])([*]{1,3})/)) {
					if(c == (c1 = (m[2] || '').length) || c1 == 3 || c == 3) break
					i1 += (m[1] || '').length + m.index + c1
				}
				if(m && c == 3 && c != c1) {
					i1 = i1 + m.index + (m[1] || '').length + c1
					c = c - c1
					while(m = a.substr(i1).match(/(^|[^\\*])([*]{1,3})/)) {
						if(c == (c1 = (m[2] || '').length) || c1 == 3 || c == 3) break
						i1 += (m[1] || '').length + m.index + c1
					}
				}
				if(m) {
					m = i1 + m.index + (m[1] || '').length
					l.push({
						ch: inlines(a.substring(i + c, m), Object.assign({}, op, {italic: c == 1 || c == 3 ? 0 : 1, bold: c == 2 || c == 3 ? 0 : 1})),
						t: (['i', 'b', 'bi'])[c - 1]
					})
					i = m + c - 1
					if(op.auto_bi && c == 3) {
						l[c = l.length - 1].t = 'i'
						l[c] = {ch: [l[c]], t: 'b'}
					}
					continue
				}
			}
		}
		if(a[i] == '~' && N(op.strikethrough)) {
			if(a[i + 1] == '~' && (m = a.substr(i + 2).match(/(^|[^\\])[~]{2}/))) {
				m = i + 2 + (m[1] || '').length + m.index
				l.push({ch: inlines(a.substring(i + 2, m), Object.assign({}, op, {strikethrough: 0})), t: 's'})
				i = m + 1
				continue
			}
		}
		if(a[i] == '!' && a[i + 1] == '[' && N(op.image)) {
			var m1, m2, t
			if(m1 = a.substr(i).match(/(^|[^\\])\]\(/)) {
				t = a.substring(i + 2, m1 = i + (m1[1] || '').length + m1.index)
				if(m2 = _url(a, m1)) {
					l.push({ch: bs(t), url: bs((m1 = a.substring(m1 + 2, m2)).split(' ')[0]), alt: _alt(m1), t: 'img'})
					i = m2
					continue
				}
			}
		}
		if(a[i] == '[' && N(op.link)) {
			m = c = 0
			for (var j = i + 1; j < a.length; j++) {
				if(a[j] == '[' && a[j - 1] == '!' && a[j - 2] != '\\') c++
				if(a[j] == ']' && a[j - 1] != '\\') {
					if(!c) {
						m = j
						break
					}
					c--
				}
			}
			if(m && a[m + 1] == '(' && (c = _url(a, m))) {
				l.push({
					ch: inlines(a.substring(i + 1, m), Object.assign({}, op, {link: 0})),
					url: bs((m = a.substring(m + 2, c)).split(' ')[0]),
					alt: _alt(m),
					t: 'link'
				})
				i = c
				continue
			}
		}
		if(a[i] == '`' && N(op.code)) {
			c = count(a, '`', i)
			var m = a.substr(i + c).match(new RegExp("(^|[^\\\\])[`]{" + c + "}"))
			if(m) {
				l.push({ch: a.substring(i + c, m = i + c + (m[1] || '').length + m.index), t: 'code'})
				i = m + (c - 1)
				continue
			}
		}
		if(a[i] == '<' && (c = a.indexOf('>', i)) != -1 && N(op.link)) {
			var t = a.substring(i + 1, c)
			var m = t == 'br' ? 1 : (
				t.match(/^https?:\/\//) ? 2 : (
					t.match(/^[^\s@]{1,}@[^\s@.]{1,}\.[^\s@.]{1,}$/) ? 3 : 0
				)
			)
			if(m) {
				l.push(m == 1 ? {t:'br'} : {ch: a.substring(i + 1, c), url: (m == 3 ? 'mailto:' : '') + a.substring(i + 1, c), t: 'link'})
				i = c
				continue
			}
		}
		if(a[i] == '@' && M(op.mention)) {
			c = (op.mention_match || mention_match)(a.substr(i + 1), op)
			if(c) {
				l.push({t: 'mention', ch: a.substr(i, c + 1)})
				i += c
				continue
			}
		}
		if(a[i] == '#' && M(op.hashtag)) {
			c = (op.hashtag_match || hashtag_match)(a.substr(i + 1), op)
			if(c) {
				l.push({t: 'hashtag', ch: a.substr(i, c + 1)})
				i += c
				continue
			}
		}


		if(typeof op.custom == 'function' && (a[i] == ' ' || !i) && (m = a.substr(i + (c = i ? 1 : 0)).match(/^([\w]{1,})\(/)) && (m = m[1])) {
			var t = a.substr(i + 1 + c + m.length).match(/(^|[^\\])\)/)
			if(t && M(op.custom((m = [m, bs(a.substr(c = i + 1 + c + m.length, t.index + 1))])[0], m[1]))) {
				if(i) def(i)
				l.push({t: 'c-' + m[0], ch: m[1]})
				i = c + t.index + 2
			}
		}
		def(i)
	}
	return l
}
const parse = (a, op) => {
	if(!op) op = {}
	a = decode(a.replace(/[\r]/g, '').replace(/(^[\n]*|[\n]*$)?/, '')).split('\n')
	var m, c, l = []
	const slist = a => a.length == 0 ? a : parse(a.map(a => a.trimStart()).join('\n')),
	ul = (i,z) => {
		if(!a[i].match(z = new RegExp('^\\' + z + ' ([^]*)$'))) return 0
		var j = i, l1 = [], bl = 0
		for (; j < a.length; j++) {
			var k = a[j].trimEnd()
			if(!k) {
				if(++bl > 5) break
				continue
			}
			if(m = k.match(z)) {
				l1.push([m[1].trim(), []])
				c = j
			}
			else if(k.match(/^\s/) && l1.length > 0) {
				l1[l1.length - 1][1].push(a[j].trimStart())
				c = j
			}
			else break
		}
		if(l1.length == 0) return 0
		l.push({ch: l1.map(a => ({a: a[0], b: slist(a[1])})), t: 'ul'})
		return c
	},
	def = i => {
		var b = a[i], c = l.length - 1, d = b.trimEnd()
		if(!b) return
		if(typeof l[c] == 'string') l[c] = l[c] + (l[c] && l[c].match(/\S$/) ? ' ' : '') + d
		else l.push(d)
		if(b.match(/[ ]{2,}$/)) l.push('')
	},
	split = (a, i) => {
		var b = [], c = 0
		while((c = a.indexOf(i, c)) != -1) {
			if(a[c - 1] == '\\') {
				a = a.substr(1)
				c++
				continue
			}
			b.push(a.substr(0, c))
			a = a.substr(c + 1)
			c = 0
		}
		if(a) b.push(a)
		return b
	}
	for (var i = 0; i < a.length; i++) {
		if(N(op.heading) && (m = a[i].match(/^([#]{1,6}) ([^]*)$/))) {
			l.push({ch: m[2], t: 'h' + m[1].length})
			continue
		}
		if(N(op.blockquote) && (m = a[i].match(/^([>]{1,}) ([^]*)$/))) {
			c = []
			for (var j = i; j < a.length; j++) if(a[j].startsWith(m[1])) c.push(a[j].substr(m[1].length).trimStart()); else break
			l.push({ch: parse(c.join('\n')), t: 'blockquote'})
			i += c.length - 1
			continue
		}
		if(N(op.rule) && a[i].match(/^[*=-]{3,}$/)) {
			l.push({t: 'hr'})
			continue
		}
		if(N(op.codeblock) && (m = a[i].match(/^([`]{3,})([^]*)?/))) {
			c = 0
			m = [new RegExp("^[`]{" + m[1].length +"}(\\s*)?$"), m[2]]
			for (var j = i + 1; j < a.length; j++) {
				if(a[j].match(m[0])) {
					l.push({ch: a.slice(i + 1, i = c = j).join('\n'), t: 'codeblock', lang: (m[1] || '').trim()})
					break
				}
			}
			if(c) continue
		}
		if(N(op.unordered_list) && (m = ul(i, '-'))) {
			if(N(op.check_list) && m != i && !l[c = l.length - 1].ch.some(a => !a.a.match(/^\[(x| )\] /))) {
				l[c].ch = l[c].ch.map(a => {
					a.v = a.a[1] != ' '
					a.a = a.a.substr(4).trim()
					return a
				})
				l[c].t = 'cl'
			}
			i = m
			continue
		}
		if(N(op.unordered_list) && (m = ul(i, '+'))) {
			i = m
			continue
		}
		if(N(op.unordered_list) && (m = ul(i, '*'))) {
			i = m
			continue
		}
		if(N(op.ordered_list) && (m = a[i].match(/^([\d]*)\. [^]*$/)) && parseInt(m[1] || '') == 1) {
			var j = i, l1 = [], bl = 0
			c = i
			for (; j < a.length; j++) {
				var k = a[j].trimEnd()
				if(!k) {
					if(++bl > 5) break
					continue
				}
				if((m = k.match(/^([\d]*)\. ([^]*)$/))) {
					if(!(m[1] = parseInt(m[1])) || (l1.length && m[1] == 1)) break
					l1.push([m[1], m[2].trim(), []])
					c = j
				}
				else if(k.match(/^\s/) && l1.length > 0) {
					l1[l1.length - 1][2].push(a[j].trimStart())
					c = j
				}
				else break
			}
			l.push({ch: l1.sort((a,b) => b[0] - a[0]).map(a => ({a: a[1], b: slist(a[2])})), t: 'ol'})
			i = c
			continue
		}
		if(N(op.codeblock) && (m = a[i].match(/^(\t|[ ]{4})./))) {
			var j = i, bl = 0
			m = m[1]
			c = [j]
			for (; j < a.length; j++) {
				if(a[j].startsWith(m)) {
					c.push(a[j].substr(m.length))
					c[0] = j
				}
				else if(!a[j] && ++bl <= 5) continue
				else break
			}
			if(c.length > 3) {
				l.push({ch: c.slice(1).join('\n'), t: 'codeblock', lang: ''})
				i = c[0]
				continue
			}
		}
		if(N(op.table) && a[i].indexOf('|') >= 0 && a[i + 1] && a[i + 1].match(/^[\s:|-]*$/)) {
			var l1 = []
			for (var j = i; j < a.length; j++) {
				var t = a[j].trimEnd()
				if(!t.match(/(^|[^\\])\|/)) break
				if(t.startsWith('|')) t = t.substr(1)
				if(t.endsWith('|') && !t.endsWith('\\|')) t = t.substr(0, t.length - 1)
				l1.push(split(t, '|').map(a => a.trim()))
				c = j
			}
			if(l1.length > 2 && !l1[1].some(a => !a.match(/^[:-]*$/)) && l1[0].length == l1[1].length) {
				for (var j = 2; j < l1.length; j++) {
					if(l1[j].length < l1[0].length) while(l1[j].length < l1[0].length) l1[j].push('')
					else if(l1[j].length > l1[0].length) l1[j] = l1[j].slice(0, l1[0].length)
				}
				l.push({ch: [l1[0], ...l1.slice(2)], t: 'table'})
				i = c
				continue
			}
		}

		if(N(op.heading) && (m = a[i].trim()) && a[i + 1] && a[i + 1].match(/^[=-]{1,}$/)) {
			l.push({ch: m, t: 'h' + (a[++i][0] == '=' ? 1 : 2)})
			continue
		}
		if(a[i - 1] == '' && a[i - 2] == '' && l[l.length - 1] != '') l.push('')
		def(i)
	}
	var _op = Object.assign({}, op, {image: 0})
	return l.map(a => {
		if(typeof a == 'string') return a ? {ch: inlines(a, op), t: 'p'} : {t:'br'}
		if(a.t.match(/^h\d$/)) a.ch = inlines(a.ch, _op)
		if(a.t == 'table') a.ch = a.ch.map(a => a.map(a => inlines(a, op)))
		if(a.t == 'ul' || a.t == 'ol' || a.t == 'cl') a.ch = a.ch.map(a => {
			a.a = inlines(a.a, _op)
			return a
		})
		return a
	})
}
exports.parse = parse
exports.inlines = inlines
