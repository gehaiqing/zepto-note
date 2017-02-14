/* Zepto v1.2.0 - zepto event ajax form ie - zeptojs.com/license */
/**
 * zepto源码阅读
 * by hopper
 * start: 2016.10.20
 * end: ..........
 */
(function(global, factory) {
    //兼容AMD规范，如使用require进行加载管理
    if (typeof define === 'function' && define.amd)
        define(function() { return factory(global) })
    else
        factory(global) //普通调用。生成全局的Zepto
}(this, function(window) {
    var Zepto = (function() {
        var undefined, key, $, classList, emptyArray = [],
            //减短调用名称
            concat = emptyArray.concat,
            filter = emptyArray.filter,
            slice = emptyArray.slice,
            document = window.document,
            elementDisplay = {},
            classCache = {},
            cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1, 'opacity': 1, 'z-index': 1, 'zoom': 1 },
            fragmentRE = /^\s*<(\w+|!)[^>]*>/, //匹配html标签，如果<div>
            singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/, //匹配是否是单个html标签
            tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig, //匹配需要有闭合的标签. 知识点:?!正则表达式
            rootNodeRE = /^(?:body|html)$/i,
            capitalRE = /([A-Z])/g,

            // special attributes that should be get/set via method calls
            methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

            adjacencyOperators = ['after', 'prepend', 'before', 'append'],
            table = document.createElement('table'),
            tableRow = document.createElement('tr'),
            containers = {
                'tr': document.createElement('tbody'),
                'tbody': table,
                'thead': table,
                'tfoot': table,
                'td': tableRow,
                'th': tableRow,
                '*': document.createElement('div')
            },
            readyRE = /complete|loaded|interactive/, //匹配document.readyState
            simpleSelectorRE = /^[\w-]*$/, //匹配简单的选择器
            class2type = {},
            toString = class2type.toString,
            zepto = {},
            camelize, uniq,
            tempParent = document.createElement('div'),
            propMap = {
                'tabindex': 'tabIndex',
                'readonly': 'readOnly',
                'for': 'htmlFor',
                'class': 'className',
                'maxlength': 'maxLength',
                'cellspacing': 'cellSpacing',
                'cellpadding': 'cellPadding',
                'rowspan': 'rowSpan',
                'colspan': 'colSpan',
                'usemap': 'useMap',
                'frameborder': 'frameBorder',
                'contenteditable': 'contentEditable'
            },
            isArray = Array.isArray ||
            function(object) { return object instanceof Array }

        /**
         * 匹配
         * 首先判断DOM对象是否有matches函数，如果有，则使用，否则新建一个div父节点，将element插入到div节点中，然后进行查找
         */
        zepto.matches = function(element, selector) {
            if (!selector || !element || element.nodeType !== 1) return false
            var matchesSelector = element.matches || element.webkitMatchesSelector ||
                element.mozMatchesSelector || element.oMatchesSelector ||
                element.matchesSelector
            if (matchesSelector) return matchesSelector.call(element, selector)
                // fall back to performing a selector:
            var match, parent = element.parentNode,
                temp = !parent
            if (temp)(parent = tempParent).appendChild(element)
            match = ~zepto.qsa(parent, selector).indexOf(element)
            temp && tempParent.removeChild(element)
            return match
        }

        //判断数据类型
        function type(obj) {
            return obj == null ? String(obj) :
                class2type[toString.call(obj)] || "object"
        }

        //是否为函数
        function isFunction(value) { return type(value) == "function" }

        /**
         * 判断是否为window
         * window.window == window
         */
        function isWindow(obj) { return obj != null && obj == obj.window }

        /**
         * 判断是否为document
         * nodeType == 9 (DOCUMENT_NODE)
         */
        function isDocument(obj) { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }

        //是否为对象
        function isObject(obj) { return type(obj) == "object" }

        /**
         * 是否为基本对象？
         * Object.getPrototypeOf？
         */
        function isPlainObject(obj) {
            return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype
        }

        /**
         * 是否为类数组
         * 数组、字符串
         */
        function likeArray(obj) {
            var length = !!obj && 'length' in obj && obj.length,
                type = $.type(obj)

            return 'function' != type && !isWindow(obj) && (
                'array' == type || length === 0 ||
                (typeof length == 'number' && length > 0 && (length - 1) in obj)
            )
        }

        //去除未定义、为null的项目
        function compact(array) { return filter.call(array, function(item) { return item != null }) }

        //展开二维数组
        function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }
        /**
         * 将破折号命名转为驼峰命名
         * background-color => backgroundColor
         */
        camelize = function(str) { return str.replace(/-+(.)?/g, function(match, chr) { return chr ? chr.toUpperCase() : '' }) }

        function dasherize(str) {
            return str.replace(/::/g, '/')
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                .replace(/([a-z\d])([A-Z])/g, '$1_$2')
                .replace(/_/g, '-')
                .toLowerCase()
        }
        /**
         * 去除数组中的重复项目
         */
        uniq = function(array) { return filter.call(array, function(item, idx) { return array.indexOf(item) == idx }) }

        /**
         * 生成样式名称 正则匹配表达式
         */
        function classRE(name) {
            return name in classCache ?
                classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
        }

        /**
         * 判断是否需要添加后缀'px'
         * 根据cssNumber排除不需要添加的style属性
         */
        function maybeAddPx(name, value) {
            return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
        }

        /**
         * 不同的标签设置默认的display属性
         */
        function defaultDisplay(nodeName) {
            var element, display
            if (!elementDisplay[nodeName]) {
                element = document.createElement(nodeName)
                document.body.appendChild(element)
                display = getComputedStyle(element, '').getPropertyValue("display")
                element.parentNode.removeChild(element)
                display == "none" && (display = "block")
                elementDisplay[nodeName] = display
            }
            return elementDisplay[nodeName]
        }

        /**
         * 获取子节点
         * 返回数组
         */
        function children(element) {
            return 'children' in element ?
                slice.call(element.children) :
                $.map(element.childNodes, function(node) { if (node.nodeType == 1) return node })
        }

        /**
         * 创建一zepto个对象
         * 包含节点、节点数目、选择器名
         */
        function Z(dom, selector) {
            var i, len = dom ? dom.length : 0
            for (i = 0; i < len; i++) this[i] = dom[i]
            this.length = len
            this.selector = selector || ''
        }

        // `$.zepto.fragment` takes a html string and an optional tag name
        // to generate DOM nodes from the given html string.
        // The generated DOM nodes are returned as an array.
        // This function can be overridden in plugins for example to make
        // it compatible with browsers that don't support the DOM fully.
        /**
         * 根据html片段生成节点
         */
        zepto.fragment = function(html, name, properties) {
            var dom, nodes, container

            // A special case optimization for a single tag
            if (singleTagRE.test(html)) dom = $(document.createElement(RegExp.$1))

            if (!dom) {
                //处理需要闭合的标签，如<div/> => <div></div>
                if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
                if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
                if (!(name in containers)) name = '*'

                container = containers[name] //创建最外层节点
                container.innerHTML = '' + html; //节点内容

                //不明白什么意思？。。。
                dom = $.each(slice.call(container.childNodes), function() {
                    container.removeChild(this)
                })
            }

            /**
             * 判断properties参数，
             * 如果是在methodAttributes里，(方法函数)，则将属性添加到对象上
             * 否则添加到节点属性上
             */
            if (isPlainObject(properties)) {
                nodes = $(dom)
                $.each(properties, function(key, value) {
                    if (methodAttributes.indexOf(key) > -1) nodes[key](value)
                    else nodes.attr(key, value)
                })
            }

            return dom
        }

        // `$.zepto.Z` swaps out the prototype of the given `dom` array
        // of nodes with `$.fn` and thus supplying all the Zepto functions
        // to the array. This method can be overridden in plugins.
        zepto.Z = function(dom, selector) {
            return new Z(dom, selector)
        }

        // `$.zepto.isZ` should return `true` if the given object is a Zepto
        // collection. This method can be overridden in plugins.
        //判断是否为zepto对象
        zepto.isZ = function(object) {
            return object instanceof zepto.Z
        }

        // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
        // takes a CSS selector and an optional context (and handles various
        // special cases).
        // This method can be overridden in plugins.
        zepto.init = function(selector, context) {
            var dom
                // If nothing given, return an empty Zepto collection
                //如果选择器为空或者未定义，返回一个空的集合
            if (!selector) return zepto.Z()
                // Optimize for string selectors
            else if (typeof selector == 'string') {
                selector = selector.trim()
                    // If it's a html fragment, create nodes from it
                    // Note: In both Chrome 21 and Firefox 15, DOM error 12
                    // is thrown if the fragment doesn't begin with <
                    /**
                     * 如果是html片段，则将该片段生成zepto对象
                     */
                if (selector[0] == '<' && fragmentRE.test(selector))
                /**
                 * 
                 * 未知知识点：
                 * RegExp.$1，获取前一次正则表达式的匹配结果，是全局变量
                 */
                    dom = zepto.fragment(selector, RegExp.$1, context), selector = null
                    // If there's a context, create a collection on that context first, and select
                    // nodes from there
                    //如果有传入context，则从context中找到选择器对应的对象
                else if (context !== undefined) return $(context).find(selector)
                    // If it's a CSS selector, use it to select nodes.
                    //如果是css选择器，通过qsa查找到对应的集合
                else dom = zepto.qsa(document, selector)
            }
            // If a function is given, call it when the DOM is ready
            /**
             * $(function(){})的形式，在文档加载完成后调用
             */
            else if (isFunction(selector)) return $(document).ready(selector)
                // If a Zepto collection is given, just return it
                //如果已经是zepto对象，立即返回
            else if (zepto.isZ(selector)) return selector
            else {
                // normalize array if an array of nodes is given
                if (isArray(selector)) dom = compact(selector)
                    // Wrap DOM nodes.
                else if (isObject(selector))
                    dom = [selector], selector = null
                    // If it's a html fragment, create nodes from it
                else if (fragmentRE.test(selector))
                    dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
                    // If there's a context, create a collection on that context first, and select
                    // nodes from there
                else if (context !== undefined) return $(context).find(selector)
                    // And last but no least, if it's a CSS selector, use it to select nodes.
                else dom = zepto.qsa(document, selector)
            }
            // create a new Zepto collection from the nodes found
            return zepto.Z(dom, selector)
        }

        // `$` will be the base `Zepto` object. When calling this
        // function just call `$.zepto.init, which makes the implementation
        // details of selecting nodes and creating Zepto collections
        // patchable in plugins.
        //入口函数
        $ = function(selector, context) {
            return zepto.init(selector, context)
        }

        /**
         * 对象的扩展
         * 使用递归实现
         * 使用源对象中的属性覆盖目标对象属性
         */
        function extend(target, source, deep) {
            for (key in source)
                if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
                    if (isPlainObject(source[key]) && !isPlainObject(target[key]))
                        target[key] = {}
                    if (isArray(source[key]) && !isArray(target[key]))
                        target[key] = []
                    extend(target[key], source[key], deep)
                } else if (source[key] !== undefined) target[key] = source[key]
        }

        // Copy all but undefined properties from one or more
        // objects to the `target` object.
        /**
         * 对象的扩展
         * 暴露为$函数
         */
        $.extend = function(target) {
            var deep, args = slice.call(arguments, 1)
            if (typeof target == 'boolean') {
                deep = target
                target = args.shift()
            }
            args.forEach(function(arg) { extend(target, arg, deep) })
            return target
        }

        // `$.zepto.qsa` is Zepto's CSS selector implementation which
        // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
        // This method can be overridden in plugins.
        /**
         * 使用：
         * getElementById
         * getElementsByClassName
         * getElementsByTagName
         * querySelectorAll //查询复杂的选择器。 IE67不支持 IE8部分支持。其他浏览器都支持
         */
        zepto.qsa = function(element, selector) {
            var found,
                maybeID = selector[0] == '#',
                maybeClass = !maybeID && selector[0] == '.',
                nameOnly = maybeID || maybeClass ? selector.slice(1) : selector, // Ensure that a 1 char tag name still gets checked
                isSimple = simpleSelectorRE.test(nameOnly)
            return (element.getElementById && isSimple && maybeID) ? // Safari DocumentFragment doesn't have getElementById
                ((found = element.getElementById(nameOnly)) ? [found] : []) :
                (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
                slice.call(
                    isSimple && !maybeID && element.getElementsByClassName ? // DocumentFragment doesn't have getElementsByClassName/TagName
                    maybeClass ? element.getElementsByClassName(nameOnly) : // If it's simple, it could be a class
                    element.getElementsByTagName(selector) : // Or a tag
                    element.querySelectorAll(selector) // Or it's not simple, and we need to query all
                )
        }

        /**
         * 过滤器
         */
        function filtered(nodes, selector) {
            return selector == null ? $(nodes) : $(nodes).filter(selector)
        }

        /**
         * 判断节点是否包含
         * 先判断是否有函数document.documentElement.contains
         */
        $.contains = document.documentElement.contains ?
            function(parent, node) {
                return parent !== node && parent.contains(node)
            } :
            function(parent, node) {
                while (node && (node = node.parentNode))
                    if (node === parent) return true
                return false
            }

        /**
         * 处理参数 arg 是函数的情况
         */
        function funcArg(context, arg, idx, payload) {
            return isFunction(arg) ? arg.call(context, idx, payload) : arg
        }

        /**
         * 设置节点属性
         * removeAttribute
         * setAttribute
         */
        function setAttribute(node, name, value) {
            value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
        }

        // access className property while respecting SVGAnimatedString
        //获取样式名称
        function className(node, value) {
            var klass = node.className || '',
                svg = klass && klass.baseVal !== undefined

            if (value === undefined) return svg ? klass.baseVal : klass
            svg ? (klass.baseVal = value) : (node.className = value)
        }

        // "true"  => true
        // "false" => false
        // "null"  => null
        // "42"    => 42
        // "42.5"  => 42.5
        // "08"    => "08"
        // JSON    => parse if valid
        // String  => self
        function deserializeValue(value) {
            try {
                return value ?
                    value == "true" ||
                    (value == "false" ? false :
                        value == "null" ? null :
                        +value + "" == value ? +value :
                        /^[\[\{]/.test(value) ? $.parseJSON(value) :
                        value) :
                    value
            } catch (e) {
                return value
            }
        }

        $.type = type
        $.isFunction = isFunction
        $.isWindow = isWindow
        $.isArray = isArray
        $.isPlainObject = isPlainObject

        /**
         * 通过for in 遍历，判断是否为空对象
         */
        $.isEmptyObject = function(obj) {
            var name
            for (name in obj) return false
            return true
        }

        /**
         * 是否为数字
         * 
         */
        $.isNumeric = function(val) {
            var num = Number(val),
                type = typeof val
            return val != null && type != 'boolean' &&
                (type != 'string' || val.length) &&
                !isNaN(num) && isFinite(num) || false
        }

        /**
         * 使用数组的indexOf判断数组中是否含有某元素
         */
        $.inArray = function(elem, array, i) {
            return emptyArray.indexOf.call(array, elem, i)
        }

        $.camelCase = camelize
            //去除前后的空白字符
        $.trim = function(str) {
            return str == null ? "" : String.prototype.trim.call(str)
        }

        // plugin compatibility
        $.uuid = 0
        $.support = {}
        $.expr = {}
            //空函数，占位用
        $.noop = function() {}

        /**
         * 映射函数，同Array.map
         * 处理数组、对象
         */
        $.map = function(elements, callback) {
            var value, values = [],
                i, key
            if (likeArray(elements))
                for (i = 0; i < elements.length; i++) {
                    value = callback(elements[i], i)
                    if (value != null) values.push(value)
                }
            else
                for (key in elements) {
                    value = callback(elements[key], key)
                    if (value != null) values.push(value)
                }
            return flatten(values)
        }

        /**
         * 遍历函数
         * 处理数组、对象
         */
        $.each = function(elements, callback) {
            var i, key
            if (likeArray(elements)) {
                for (i = 0; i < elements.length; i++)
                    if (callback.call(elements[i], i, elements[i]) === false) return elements
            } else {
                for (key in elements)
                    if (callback.call(elements[key], key, elements[key]) === false) return elements
            }

            return elements
        }

        //元素过滤
        $.grep = function(elements, callback) {
            return filter.call(elements, callback)
        }

        //JSON parse 别名
        if (window.JSON) $.parseJSON = JSON.parse

        // Populate the class2type map
        /**
         * 判断数据类型
         * 使用toString方法，如toString.call('test') == '[objec String]'
         */
        $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
            class2type["[object " + name + "]"] = name.toLowerCase()
        })

        // Define methods that will be available on all
        // Zepto collections
        /**
         * Zetpo对象的prototype对象
         */
        $.fn = {
            constructor: zepto.Z,
            length: 0,

            // Because a collection acts like an array
            // copy over these useful array functions.
            forEach: emptyArray.forEach,
            reduce: emptyArray.reduce,
            push: emptyArray.push,
            sort: emptyArray.sort,
            splice: emptyArray.splice,
            indexOf: emptyArray.indexOf,
            concat: function() {
                var i, value, args = []
                for (i = 0; i < arguments.length; i++) {
                    value = arguments[i]
                    args[i] = zepto.isZ(value) ? value.toArray() : value
                }
                return concat.apply(zepto.isZ(this) ? this.toArray() : this, args)
            },

            // `map` and `slice` in the jQuery API work differently
            // from their array counterparts
            map: function(fn) {
                return $($.map(this, function(el, i) { return fn.call(el, i, el) }))
            },
            slice: function() {
                return $(slice.apply(this, arguments))
            },

            /**
             * document ready 函数
             * 在文档加载完成后调用，如果已经加载完成，立即调用
             */
            ready: function(callback) {
                // need to check if document.body exists for IE as that browser reports
                // document ready when it hasn't yet created the body element
                if (readyRE.test(document.readyState) && document.body) callback($)
                else document.addEventListener('DOMContentLoaded', function() { callback($) }, false)
                return this
            },
            /**
             * 获取当前对象包含的dom对象数组
             */
            get: function(idx) {
                return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
            },
            toArray: function() { return this.get() },
            //选择器的匹配项数量
            size: function() {
                return this.length
            },
            /**
             * 删除
             * 通过parentNode.removeChild删除
             */
            remove: function() {
                return this.each(function() {
                    if (this.parentNode != null)
                        this.parentNode.removeChild(this)
                })
            },
            //遍历
            each: function(callback) {
                emptyArray.every.call(this, function(el, idx) {
                    return callback.call(el, idx, el) !== false
                })
                return this
            },
            /**
             * 选择器过滤
             */
            filter: function(selector) {
                if (isFunction(selector)) return this.not(this.not(selector))
                return $(filter.call(this, function(element) {
                    return zepto.matches(element, selector)
                }))
            },
            /**
             * 追加选择器
             */
            add: function(selector, context) {
                return $(uniq(this.concat($(selector, context))))
            },
            /**
             * 是否匹配选择器
             */
            is: function(selector) {
                return this.length > 0 && zepto.matches(this[0], selector)
            },
            /**
             * 是否不属于选择器范文
             */
            not: function(selector) {
                var nodes = []
                if (isFunction(selector) && selector.call !== undefined)
                    this.each(function(idx) {
                        if (!selector.call(this, idx)) nodes.push(this)
                    })
                else {
                    var excludes = typeof selector == 'string' ? this.filter(selector) :
                        (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
                    this.forEach(function(el) {
                        if (excludes.indexOf(el) < 0) nodes.push(el)
                    })
                }
                return $(nodes)
            },
            /**
             * 是否包含某选择器
             * 
             */
            has: function(selector) {
                return this.filter(function() {
                    return isObject(selector) ?
                        $.contains(this, selector) :
                        $(this).find(selector).size()
                })
            },
            /**
             * 获取第N个节点
             * 如果传入-1，返回所有的
             */
            eq: function(idx) {
                return idx === -1 ? this.slice(idx) : this.slice(idx, +idx + 1)
            },
            /**
             * 获取第一个节点对象
             * el 除了 object 还可能是什么？!isObject(el) 疑问
             */
            first: function() {
                var el = this[0]
                return el && !isObject(el) ? el : $(el)
            },
            /**
             * 获取最后一个节点对象
             * el 除了 object 还可能是什么？!isObject(el) 疑问
             */
            last: function() {
                var el = this[this.length - 1]
                return el && !isObject(el) ? el : $(el)
            },
            /**
             * 当前对象中查找。
             * 支持：dom对象，选择器
             */
            find: function(selector) {
                var result, $this = this
                if (!selector) result = $()
                else if (typeof selector == 'object')
                    result = $(selector).filter(function() {
                        var node = this
                        return emptyArray.some.call($this, function(parent) {
                            return $.contains(parent, node)
                        })
                    })
                else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
                else result = this.map(function() { return zepto.qsa(this, selector) })
                return result
            },
            /**
             * 沿 DOM 树向上遍历，直到找到已应用选择器的一个匹配为止。
             */
            closest: function(selector, context) {
                var nodes = [],
                    collection = typeof selector == 'object' && $(selector)
                this.each(function(_, node) {
                    while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
                        node = node !== context && !isDocument(node) && node.parentNode
                    if (node && nodes.indexOf(node) < 0) nodes.push(node)
                })
                return $(nodes)
            },
            /**
             * 循环遍历节点的parentNode获取所有的父节点
             */
            parents: function(selector) {
                var ancestors = [],
                    nodes = this
                while (nodes.length > 0)
                    nodes = $.map(nodes, function(node) {
                        if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
                            ancestors.push(node)
                            return node
                        }
                    })
                return filtered(ancestors, selector)
            },
            /**
             * 使用pluck获取属性parentNode得到的数组，
             * 通过uniq方法去除重复的(如兄弟节点返回的应是一个父节点)
             * filterd过滤传入的selector选择器
             */
            parent: function(selector) {
                return filtered(uniq(this.pluck('parentNode')), selector)
            },
            /**
             * 获取子节点
             * 返回数组
             */
            children: function(selector) {
                return filtered(this.map(function() { return children(this) }), selector)
            },
            /**
             * 获取文本和注释节点
             * contentDocument获取iframe中的内容
             */
            contents: function() {
                return this.map(function() { return this.contentDocument || slice.call(this.childNodes) })
            },
            /**
             * 获取兄弟节点
             */
            siblings: function(selector) {
                return filtered(this.map(function(i, el) {
                    return filter.call(children(el.parentNode), function(child) { return child !== el })
                }), selector)
            },
            /**
             * 设置innerHTML为空
             */
            empty: function() {
                return this.each(function() { this.innerHTML = '' })
            },
            // `pluck` is borrowed from Prototype.js
            /**
             * 提取属性值
             */
            pluck: function(property) {
                return $.map(this, function(el) { return el[property] })
            },
            /**
             * 显示节点
             * 获取节点的默认display属性,然后赋值给this.style.display
             */
            show: function() {
                return this.each(function() {
                    this.style.display == "none" && (this.style.display = '')
                    if (getComputedStyle(this, '').getPropertyValue("display") == "none")
                        this.style.display = defaultDisplay(this.nodeName)
                })
            },
            /**
             * 替换节点
             * 将参数newContent插入到节点前，然后删除当前节点
             */
            replaceWith: function(newContent) {
                return this.before(newContent).remove()
            },
            wrap: function(structure) {
                var func = isFunction(structure)
                if (this[0] && !func)
                    var dom = $(structure).get(0),
                        clone = dom.parentNode || this.length > 1

                return this.each(function(index) {
                    $(this).wrapAll(
                        func ? structure.call(this, index) :
                        clone ? dom.cloneNode(true) : dom
                    )
                })
            },
            wrapAll: function(structure) {
                if (this[0]) {
                    $(this[0]).before(structure = $(structure))
                    var children
                        // drill down to the inmost element
                    while ((children = structure.children()).length) structure = children.first()
                    $(structure).append(this)
                }
                return this
            },
            wrapInner: function(structure) {
                var func = isFunction(structure)
                return this.each(function(index) {
                    var self = $(this),
                        contents = self.contents(),
                        dom = func ? structure.call(this, index) : structure
                    contents.length ? contents.wrapAll(dom) : self.append(dom)
                })
            },
            unwrap: function() {
                this.parent().each(function() {
                    $(this).replaceWith($(this).children())
                })
                return this
            },
            /**
             * 克隆节点
             * 原生cloneNode, 参数为是否深度克隆(克隆包含的子节点)
             */
            clone: function() {
                return this.map(function() { return this.cloneNode(true) })
            },
            /**
             * 隐藏
             */
            hide: function() {
                return this.css("display", "none")
            },
            /**
             * 在显示和隐藏之间切换
             */
            toggle: function(setting) {
                return this.each(function() {
                    var el = $(this);
                    (setting === undefined ? el.css("display") == "none" : setting) ? el.show(): el.hide()
                })
            },
            /**
             * 使用原生属性 previousElementSibling  获取前一个节点
             */
            prev: function(selector) { return $(this.pluck('previousElementSibling')).filter(selector || '*') },
            /**
             * 使用原生属性 nextElementSibling 获取下一个节点
             */
            next: function(selector) { return $(this.pluck('nextElementSibling')).filter(selector || '*') },
            /**
             * 获取/设置html内容，通过原生innerHTML
             */
            html: function(html) {
                return 0 in arguments ?
                    this.each(function(idx) {
                        var originHtml = this.innerHTML
                        $(this).empty().append(funcArg(this, html, idx, originHtml))
                    }) :
                    (0 in this ? this[0].innerHTML : null)
            },
            /**
             * 通过原生 textContent 属性设置文本内容
             */
            text: function(text) {
                return 0 in arguments ?
                    this.each(function(idx) {
                        var newText = funcArg(this, text, idx, this.textContent)
                        this.textContent = newText == null ? '' : '' + newText
                    }) :
                    (0 in this ? this.pluck('textContent').join("") : null)
            },
            /**
             * 获取/设置节点的自定义属性
             */
            attr: function(name, value) {
                var result
                return (typeof name == 'string' && !(1 in arguments)) ?
                    (0 in this && this[0].nodeType == 1 && (result = this[0].getAttribute(name)) != null ? result : undefined) :
                    this.each(function(idx) {
                        if (this.nodeType !== 1) return
                        if (isObject(name))
                            for (key in name) setAttribute(this, key, name[key])
                        else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
                    })
            },
            /**
             * 删除自定义属性
             */
            removeAttr: function(name) {
                return this.each(function() {
                    this.nodeType === 1 && name.split(' ').forEach(function(attribute) {
                        setAttribute(this, attribute)
                    }, this)
                })
            },
            /**
             * 设置/获取节点的自带属性
             */
            prop: function(name, value) {
                name = propMap[name] || name
                return (1 in arguments) ?
                    this.each(function(idx) {
                        this[name] = funcArg(this, value, idx, this[name])
                    }) :
                    (this[0] && this[0][name])
            },
            /**
             * 删除节点的自带属性
             */
            removeProp: function(name) {
                name = propMap[name] || name
                return this.each(function() { delete this[name] })
            },
            /**
             * 设置/获取 自定义的 data- 前缀属性
             */
            data: function(name, value) {
                var attrName = 'data-' + name.replace(capitalRE, '-$1').toLowerCase()

                var data = (1 in arguments) ?
                    this.attr(attrName, value) :
                    this.attr(attrName)

                return data !== null ? deserializeValue(data) : undefined
            },
            /**
             * 设置/获取节点的value值
             */
            val: function(value) {
                if (0 in arguments) {
                    if (value == null) value = ""
                    return this.each(function(idx) {
                        this.value = funcArg(this, value, idx, this.value)
                    })
                } else {
                    return this[0] && (this[0].multiple ?
                        $(this[0]).find('option').filter(function() { return this.selected }).pluck('value') :
                        this[0].value)
                }
            },
            /**
             * 获取/设置 相对窗口的绝对位置
             * 使用getBoundingClientRect
             */
            offset: function(coordinates) {
                if (coordinates) return this.each(function(index) {
                    var $this = $(this),
                        coords = funcArg(this, coordinates, index, $this.offset()),
                        parentOffset = $this.offsetParent().offset(),
                        props = {
                            top: coords.top - parentOffset.top,
                            left: coords.left - parentOffset.left
                        }

                    if ($this.css('position') == 'static') props['position'] = 'relative'
                    $this.css(props)
                })
                if (!this.length) return null
                if (document.documentElement !== this[0] && !$.contains(document.documentElement, this[0]))
                    return { top: 0, left: 0 }
                var obj = this[0].getBoundingClientRect()
                return {
                    left: obj.left + window.pageXOffset,
                    top: obj.top + window.pageYOffset,
                    width: Math.round(obj.width),
                    height: Math.round(obj.height)
                }
            },
            /**
             * 设置/获取样式属性值
             */
            css: function(property, value) {
                if (arguments.length < 2) { //只有一个参数时，返回第一个元素的样式值
                    var element = this[0]
                    if (typeof property == 'string') { //单个属性
                        if (!element) return
                        return element.style[camelize(property)] || getComputedStyle(element, '').getPropertyValue(property)
                    } else if (isArray(property)) { //如果是数组，返回数组里的所有属性的值
                        if (!element) return
                        var props = {}
                        var computedStyle = getComputedStyle(element, '')
                        $.each(property, function(_, prop) {
                            props[prop] = (element.style[camelize(prop)] || computedStyle.getPropertyValue(prop))
                        })
                        return props
                    }
                }

                var css = ''
                if (type(property) == 'string') {
                    if (!value && value !== 0)
                        this.each(function() { this.style.removeProperty(dasherize(property)) })
                    else
                        css = dasherize(property) + ":" + maybeAddPx(property, value)
                } else {
                    for (key in property)
                        if (!property[key] && property[key] !== 0)
                            this.each(function() { this.style.removeProperty(dasherize(key)) })
                        else
                            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
                }

                return this.each(function() { this.style.cssText += ';' + css })
            },
            index: function(element) {
                return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
            },
            /**
             * 是否包含有某类名
             */
            hasClass: function(name) {
                if (!name) return false
                return emptyArray.some.call(this, function(el) {
                        return this.test(className(el)) //this即是classRE(name)
                    }, classRE(name)) //classRE(name) 作为该执行回调时使用，传递给函数，用作 "this" 的值
            },
            /**
             * 添加类
             */
            addClass: function(name) {
                if (!name) return this
                return this.each(function(idx) {
                    if (!('className' in this)) return
                    classList = []
                    var cls = className(this),
                        newName = funcArg(this, name, idx, cls)
                    newName.split(/\s+/g).forEach(function(klass) {
                        if (!$(this).hasClass(klass)) classList.push(klass)
                    }, this)
                    classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
                })
            },
            /**
             * 删除类
             */
            removeClass: function(name) {
                return this.each(function(idx) {
                    if (!('className' in this)) return
                    if (name === undefined) return className(this, '')
                    classList = className(this)
                    funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass) {
                        classList = classList.replace(classRE(klass), " ")
                    })
                    className(this, classList.trim())
                })
            },
            /**
             * 添加/删除类name
             * when: 未传入时，则根据当前是否含有该类作为判断条件，含有则去掉，否则添加
             *       有传入时，根据when判断,为true,则添加；false则去掉
             */
            toggleClass: function(name, when) {
                if (!name) return this
                return this.each(function(idx) {
                    var $this = $(this),
                        names = funcArg(this, name, idx, className(this))
                    names.split(/\s+/g).forEach(function(klass) {
                        (when === undefined ? !$this.hasClass(klass) : when) ?
                        $this.addClass(klass): $this.removeClass(klass)
                    })
                })
            },
            /**
             * 获取/设置竖向滚动位置
             */
            scrollTop: function(value) {
                if (!this.length) return
                var hasScrollTop = 'scrollTop' in this[0]
                if (value === undefined) return hasScrollTop ? this[0].scrollTop : this[0].pageYOffset
                return this.each(hasScrollTop ?
                    function() { this.scrollTop = value } :
                    function() { this.scrollTo(this.scrollX, value) })
            },
            /**
             * 获取/设置横向滚动位置
             */
            scrollLeft: function(value) {
                if (!this.length) return
                var hasScrollLeft = 'scrollLeft' in this[0]
                if (value === undefined) return hasScrollLeft ? this[0].scrollLeft : this[0].pageXOffset
                return this.each(hasScrollLeft ?
                    function() { this.scrollLeft = value } :
                    function() { this.scrollTo(value, this.scrollY) })
            },
            /**
             * 取相对于它最近的具有相对位置(position:relative或position:absolute)的父级元素的距离，如果找不到这样的元素，则返回相对于浏览器的距离。
             * 
             */
            position: function() {
                if (!this.length) return

                var elem = this[0],
                    // Get *real* offsetParent
                    offsetParent = this.offsetParent(),
                    // Get correct offsets
                    offset = this.offset(),
                    parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

                // Subtract element margins
                // note: when an element has margin: auto the offsetLeft and marginLeft
                // are the same in Safari causing offset.left to incorrectly be 0
                //margin会导致父节点的位置跟随变化，应减去
                offset.top -= parseFloat($(elem).css('margin-top')) || 0
                offset.left -= parseFloat($(elem).css('margin-left')) || 0

                // Add offsetParent borders
                parentOffset.top += parseFloat($(offsetParent[0]).css('border-top-width')) || 0
                parentOffset.left += parseFloat($(offsetParent[0]).css('border-left-width')) || 0

                // Subtract the two offsets
                return {
                    top: offset.top - parentOffset.top,
                    left: offset.left - parentOffset.left
                }
            },
            /**
             * 获取相对位置所参照的父节点，该父节点的position不能为static
             */
            offsetParent: function() {
                return this.map(function() {
                    var parent = this.offsetParent || document.body
                    while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
                        parent = parent.offsetParent
                    return parent
                })
            }
        }

        // for now
        //另外一个删除方法
        $.fn.detach = $.fn.remove

        // Generate the `width` and `height` functions
        //生成width和height 获取/设置函数
        ;
        ['width', 'height'].forEach(function(dimension) {
            var dimensionProperty =
                dimension.replace(/./, function(m) { return m[0].toUpperCase() })

            $.fn[dimension] = function(value) {
                var offset, el = this[0]
                if (value === undefined) return isWindow(el) ? el['inner' + dimensionProperty] : //window使用innerWidth和innerHeight
                    isDocument(el) ? el.documentElement['scroll' + dimensionProperty] : //document使用scrollWidth和scrollHeight
                    (offset = this.offset()) && offset[dimension]
                else return this.each(function(idx) {
                    el = $(this)
                    el.css(dimension, funcArg(this, value, idx, el[dimension]()))
                })
            }
        })

        /**
         * 递归遍历node节点，每个节点用fun函数处理
         */
        function traverseNode(node, fun) {
            fun(node)
            for (var i = 0, len = node.childNodes.length; i < len; i++)
                traverseNode(node.childNodes[i], fun)
        }

        // Generate the `after`, `prepend`, `before`, `append`,
        // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
        //生成 `after`, `prepend`, `before`, `append`,
        // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` 方法.
        adjacencyOperators.forEach(function(operator, operatorIndex) {
            var inside = operatorIndex % 2 //=> prepend, append. inside表示插入到节点内部

            $.fn[operator] = function() {
                // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
                var argType, nodes = $.map(arguments, function(arg) {
                        var arr = []
                        argType = type(arg)
                        if (argType == "array") {//数组处理
                            arg.forEach(function(el) {
                                if (el.nodeType !== undefined) return arr.push(el) //节点对象
                                else if ($.zepto.isZ(el)) return arr = arr.concat(el.get())
                                arr = arr.concat(zepto.fragment(el))
                            })
                            return arr
                        }
                        return argType == "object" || arg == null ?//单个节点处理 zepto对象/html字符串
                            arg : zepto.fragment(arg)
                    }),
                    parent, copyByClone = this.length > 1
                if (nodes.length < 1) return this

                return this.each(function(_, target) {
                    parent = inside ? target : target.parentNode //如果是不是内部则取父节点作为插入的父节点

                    // convert all methods to a "before" operation
                    //将所有的方法都转化为 before 操作，即改变目标对象
                    target = operatorIndex == 0 ? target.nextSibling :
                        operatorIndex == 1 ? target.firstChild :
                        operatorIndex == 2 ? target :
                        null

                    var parentInDocument = $.contains(document.documentElement, parent)

                    nodes.forEach(function(node) {
                        if (copyByClone) node = node.cloneNode(true)
                        else if (!parent) return $(node).remove()

                        parent.insertBefore(node, target)
                        if (parentInDocument) traverseNode(node, function(el) {
                            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
                                (!el.type || el.type === 'text/javascript') && !el.src) {
                                var target = el.ownerDocument ? el.ownerDocument.defaultView : window
                                target['eval'].call(target, el.innerHTML)
                            }
                        })
                    })
                })
            }

            // after    => insertAfter
            // prepend  => prependTo
            // before   => insertBefore
            // append   => appendTo
            $.fn[inside ? operator + 'To' : 'insert' + (operatorIndex ? 'Before' : 'After')] = function(html) {
                $(html)[operator](this)
                return this
            }
        })

        zepto.Z.prototype = Z.prototype = $.fn

        // Export internal API functions in the `$.zepto` namespace
        zepto.uniq = uniq
        zepto.deserializeValue = deserializeValue
        $.zepto = zepto

        return $
    })()

    window.Zepto = Zepto
    window.$ === undefined && (window.$ = Zepto)

    ;
    (function($) {
        var _zid = 1,
            undefined,
            slice = Array.prototype.slice,
            isFunction = $.isFunction,
            isString = function(obj) { return typeof obj == 'string' },
            handlers = {},
            specialEvents = {},
            focusinSupported = 'onfocusin' in window,
            focus = { focus: 'focusin', blur: 'focusout' },
            hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

        specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

        
        /**
         * 生成一个全局id，最有到元素element
         * 
         * @param {any} element
         * @returns
         */
        function zid(element) {
            return element._zid || (element._zid = _zid++)
        }


        /**
         * 
         * 
         * @param {any} element
         * @param {any} event
         * @param {any} fn
         * @param {any} selector
         * @returns
         */
        function findHandlers(element, event, fn, selector) {
            event = parse(event)
            if (event.ns) var matcher = matcherFor(event.ns)
            return (handlers[zid(element)] || []).filter(function(handler) {
                return handler &&
                    (!event.e || handler.e == event.e) &&
                    (!event.ns || matcher.test(handler.ns)) &&
                    (!fn || zid(handler.fn) === zid(fn)) &&
                    (!selector || handler.sel == selector)
            })
        }


        /**
         * 
         * 
         * @param {any} event
         * @returns
         */
        function parse(event) {
            var parts = ('' + event).split('.')
            return { e: parts[0], ns: parts.slice(1).sort().join(' ') }
        }

        function matcherFor(ns) {
            return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
        }

        function eventCapture(handler, captureSetting) {
            return handler.del &&
                (!focusinSupported && (handler.e in focus)) ||
                !!captureSetting
        }

        function realEvent(type) {
            return hover[type] || (focusinSupported && focus[type]) || type
        }


        /**
         * 事件添加
         * 
         * @param {any} element 添加事件的元素
         * @param {any} events 事件
         * @param {function} fn 回调函数
         * @param {any} data
         * @param {any} selector 子选择器
         * @param {any} delegator
         * @param {any} capture
         */
        function add(element, events, fn, data, selector, delegator, capture) {
            var id = zid(element),
                set = (handlers[id] || (handlers[id] = []))
            events.split(/\s/).forEach(function(event) {
                if (event == 'ready') return $(document).ready(fn)
                var handler = parse(event)
                handler.fn = fn
                handler.sel = selector
                    // emulate mouseenter, mouseleave
                if (handler.e in hover) fn = function(e) {
                    var related = e.relatedTarget
                    if (!related || (related !== this && !$.contains(this, related)))
                        return handler.fn.apply(this, arguments)
                }
                handler.del = delegator
                var callback = delegator || fn
                handler.proxy = function(e) {
                    e = compatible(e)
                    if (e.isImmediatePropagationStopped()) return
                    e.data = data
                    var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args))
                    if (result === false) e.preventDefault(), e.stopPropagation()
                    return result
                }
                handler.i = set.length
                set.push(handler)
                if ('addEventListener' in element)
                    element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
            })
        }


        /**
         * 去除监听的事件
         * 
         * @param {any} element 事件元素
         * @param {any} events 事件名称,支持以空格分开的多个事件
         * @param {any} fn 回调函数
         * @param {any} selector 子选择器
         * @param {any} capture 是否捕获事件
         */
        function remove(element, events, fn, selector, capture) {
            var id = zid(element);
            (events || '').split(/\s/).forEach(function(event) {
                findHandlers(element, event, fn, selector).forEach(function(handler) {
                    delete handlers[id][handler.i]
                    if ('removeEventListener' in element)
                        element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
                })
            })
        }

        $.event = { add: add, remove: remove }

        $.proxy = function(fn, context) {
            var args = (2 in arguments) && slice.call(arguments, 2)
            if (isFunction(fn)) {
                var proxyFn = function() { return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments) }
                proxyFn._zid = zid(fn)
                return proxyFn
            } else if (isString(context)) {
                if (args) {
                    args.unshift(fn[context], fn)
                    return $.proxy.apply(null, args)
                } else {
                    return $.proxy(fn[context], fn)
                }
            } else {
                throw new TypeError("expected function")
            }
        }

        /**
         * 简易的on函数
         */
        $.fn.bind = function(event, data, callback) {
            return this.on(event, data, callback)
        }
        /**
         * 简易的off函数
         */
        $.fn.unbind = function(event, callback) {
            return this.off(event, callback)
        }
        /**
         * 添加一次性事件
         */
        $.fn.one = function(event, selector, data, callback) {
            return this.on(event, selector, data, callback, 1)
        }

        var returnTrue = function() { return true },
            returnFalse = function() { return false },
            ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$|webkitMovement[XY]$)/,
            eventMethods = {
                preventDefault: 'isDefaultPrevented',
                stopImmediatePropagation: 'isImmediatePropagationStopped',
                stopPropagation: 'isPropagationStopped'
            }

        function compatible(event, source) {
            if (source || !event.isDefaultPrevented) {
                source || (source = event)

                $.each(eventMethods, function(name, predicate) {
                    var sourceMethod = source[name]
                    event[name] = function() {
                        this[predicate] = returnTrue
                        return sourceMethod && sourceMethod.apply(source, arguments)
                    }
                    event[predicate] = returnFalse
                })

                event.timeStamp || (event.timeStamp = Date.now())

                if (source.defaultPrevented !== undefined ? source.defaultPrevented :
                    'returnValue' in source ? source.returnValue === false :
                    source.getPreventDefault && source.getPreventDefault())
                    event.isDefaultPrevented = returnTrue
            }
            return event
        }

        function createProxy(event) {
            var key, proxy = { originalEvent: event }
            for (key in event)
                if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

            return compatible(proxy, event)
        }

        /**
         * 事件委托，用于子选择器selector
         * 实际使用on函数实现，只是参数顺序不同
         */
        $.fn.delegate = function(selector, event, callback) {
            return this.on(event, selector, callback)
        }
        /**
         * 去除事件委托，用于子选择器selector
         * 实际使用off函数实现，只是参数顺序不同
         */
        $.fn.undelegate = function(selector, event, callback) {
            return this.off(event, selector, callback)
        }

        /**
         * live函数
         * 使得后来添加的元素同样能使用绑定的事件
         * 通过在body上添加事件委托
         */
        $.fn.live = function(event, callback) {
            $(document.body).delegate(this.selector, event, callback)
            return this
        }
        /**
         * 取消绑定的全局委托事件
         */
        $.fn.die = function(event, callback) {
            $(document.body).undelegate(this.selector, event, callback)
            return this
        }

        /**
         * 添加事件
         * 
         * @param event 事件名
         * @param selector 子选择器
         * @param data 附加的数据
         * @param callback 回调函数
         * @param one 是否只处理一次事件
         */
        $.fn.on = function(event, selector, data, callback, one) {
            var autoRemove, delegator, $this = this
            if (event && !isString(event)) {//event为map时，有多个事件添加
                $.each(event, function(type, fn) {
                    $this.on(type, selector, data, fn, one)
                })
                return $this
            }

            if (!isString(selector) && !isFunction(callback) && callback !== false)//没有子选择器，参数依次前移
                callback = data, data = selector, selector = undefined
            if (callback === undefined || data === false)//只有两个参数时(event, callback),再次设置callback
                callback = data, data = undefined

            if (callback === false) callback = returnFalse //如果callback为false，则设置为默认的返回false的函数

            return $this.each(function(_, element) {
                if (one) autoRemove = function(e) {//仅处理一次事件
                    remove(element, e.type, callback)
                    return callback.apply(this, arguments)
                }

                if (selector) delegator = function(e) {//处理有子选择器的情况，委托代理
                    var evt, match = $(e.target).closest(selector, element).get(0) //根据当前事件目标获取到最近的符合子选择器selector的元素
                    if (match && match !== element) {//如果有符合的元素，则生成代理事件，将目标元素设置为匹配到的元素
                        evt = $.extend(createProxy(e), { currentTarget: match, liveFired: element })
                        return (autoRemove || callback).apply(match, [evt].concat(slice.call(arguments, 1)))
                    }
                }

                add(element, event, callback, data, selector, delegator || autoRemove)//添加事件
            })
        }
        /**
         * 去除事件
         * 
         * @param event 事件名
         * @param selector 子选择器
         * @param callback 回调函数
         */
        $.fn.off = function(event, selector, callback) {
            var $this = this
            if (event && !isString(event)) {
                $.each(event, function(type, fn) {
                    $this.off(type, selector, fn)
                })
                return $this
            }

            if (!isString(selector) && !isFunction(callback) && callback !== false)
                callback = selector, selector = undefined

            if (callback === false) callback = returnFalse

            return $this.each(function() {
                remove(this, event, callback, selector)
            })
        }

        /**
         * 事件触发
         * 使用原生 dispatchEvent 触发事件
         */
        $.fn.trigger = function(event, args) {
            event = (isString(event) || $.isPlainObject(event)) ? $.Event(event) : compatible(event)
            event._args = args
            return this.each(function() {
                // handle focus(), blur() by calling them directly
                if (event.type in focus && typeof this[event.type] == "function") this[event.type]()
                    // items in the collection might not be DOM elements
                else if ('dispatchEvent' in this) this.dispatchEvent(event)
                else $(this).triggerHandler(event, args)
            })
        }

        // triggers event handlers on current element just as if an event occurred,
        // doesn't trigger an actual event, doesn't bubble
        $.fn.triggerHandler = function(event, args) {
            var e, result
            this.each(function(i, element) {
                e = createProxy(isString(event) ? $.Event(event) : event)
                e._args = args
                e.target = element
                $.each(findHandlers(element, event.type || event), function(i, handler) {
                    result = handler.proxy(e)
                    if (e.isImmediatePropagationStopped()) return false
                })
            })
            return result
        }

        // shortcut methods for `.bind(event, fn)` for each event type
        ;
        ('focusin focusout focus blur load resize scroll unload click dblclick ' +
            'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
            'change select keydown keypress keyup error').split(' ').forEach(function(event) {
            $.fn[event] = function(callback) {
                return (0 in arguments) ?
                    this.bind(event, callback) :
                    this.trigger(event)
            }
        })

        $.Event = function(type, props) {
            if (!isString(type)) props = type, type = props.type
            var event = document.createEvent(specialEvents[type] || 'Events'),
                bubbles = true
            if (props)
                for (var name in props)(name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
            event.initEvent(type, bubbles, true)
            return compatible(event)
        }

    })(Zepto)

    ;
    (function($) {
        var jsonpID = +new Date(),//+号使用后，转换为数字了
            document = window.document,
            key,
            name,
            rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            scriptTypeRE = /^(?:text|application)\/javascript/i,
            xmlTypeRE = /^(?:text|application)\/xml/i,
            jsonType = 'application/json',
            htmlType = 'text/html',
            blankRE = /^\s*$/,
            originAnchor = document.createElement('a')

        originAnchor.href = window.location.href

        // trigger a custom event and return false if it was cancelled
        function triggerAndReturn(context, eventName, data) {
            var event = $.Event(eventName)
            $(context).trigger(event, data)
            return !event.isDefaultPrevented()
        }

        // trigger an Ajax "global" event
        function triggerGlobal(settings, context, eventName, data) {
            if (settings.global) return triggerAndReturn(context || document, eventName, data)
        }

        // Number of active Ajax requests
        $.active = 0

        function ajaxStart(settings) {
            if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
        }

        function ajaxStop(settings) {
            if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
        }

        // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
        function ajaxBeforeSend(xhr, settings) {
            var context = settings.context
            if (settings.beforeSend.call(context, xhr, settings) === false ||
                triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
                return false

            triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
        }

        function ajaxSuccess(data, xhr, settings, deferred) {
            var context = settings.context,
                status = 'success'
            settings.success.call(context, data, status, xhr)
            if (deferred) deferred.resolveWith(context, [data, status, xhr])
            triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
            ajaxComplete(status, xhr, settings)
        }
        // type: "timeout", "error", "abort", "parsererror"
        function ajaxError(error, type, xhr, settings, deferred) {
            var context = settings.context
            settings.error.call(context, xhr, type, error)
            if (deferred) deferred.rejectWith(context, [xhr, type, error])
            triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error || type])
            ajaxComplete(type, xhr, settings)
        }
        // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
        function ajaxComplete(status, xhr, settings) {
            var context = settings.context
            settings.complete.call(context, xhr, status)
            triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
            ajaxStop(settings)
        }

        function ajaxDataFilter(data, type, settings) {
            if (settings.dataFilter == empty) return data
            var context = settings.context
            return settings.dataFilter.call(context, data, type)
        }

        // Empty function, used as default callback
        //空函数
        function empty() {}

        $.ajaxJSONP = function(options, deferred) {
            if (!('type' in options)) return $.ajax(options)

            var _callbackName = options.jsonpCallback,
                callbackName = ($.isFunction(_callbackName) ?
                    _callbackName() : _callbackName) || ('Zepto' + (jsonpID++)),
                script = document.createElement('script'),
                originalCallback = window[callbackName],
                responseData,
                abort = function(errorType) {
                    $(script).triggerHandler('error', errorType || 'abort')
                },
                xhr = { abort: abort },
                abortTimeout

            if (deferred) deferred.promise(xhr)

            $(script).on('load error', function(e, errorType) {
                clearTimeout(abortTimeout)
                $(script).off().remove()

                if (e.type == 'error' || !responseData) {
                    ajaxError(null, errorType || 'error', xhr, options, deferred)
                } else {
                    ajaxSuccess(responseData[0], xhr, options, deferred)
                }

                window[callbackName] = originalCallback
                if (responseData && $.isFunction(originalCallback))
                    originalCallback(responseData[0])

                originalCallback = responseData = undefined
            })

            if (ajaxBeforeSend(xhr, options) === false) {
                abort('abort')
                return xhr
            }

            window[callbackName] = function() {
                responseData = arguments
            }

            script.src = options.url.replace(/\?(.+)=\?/, '?$1=' + callbackName)
            document.head.appendChild(script)

            if (options.timeout > 0) abortTimeout = setTimeout(function() {
                abort('timeout')
            }, options.timeout)

            return xhr
        }

        $.ajaxSettings = {
            // Default type of request
            type: 'GET',
            // Callback that is executed before request
            beforeSend: empty,
            // Callback that is executed if the request succeeds
            success: empty,
            // Callback that is executed the the server drops error
            error: empty,
            // Callback that is executed on request complete (both: error and success)
            complete: empty,
            // The context for the callbacks
            context: null,
            // Whether to trigger "global" Ajax events
            global: true,
            // Transport
            xhr: function() {
                return new window.XMLHttpRequest()
            },
            // MIME types mapping
            // IIS returns Javascript as "application/x-javascript"
            accepts: {
                script: 'text/javascript, application/javascript, application/x-javascript',
                json: jsonType,
                xml: 'application/xml, text/xml',
                html: htmlType,
                text: 'text/plain'
            },
            // Whether the request is to another domain
            crossDomain: false,
            // Default timeout
            timeout: 0,
            // Whether data should be serialized to string
            processData: true,
            // Whether the browser should be allowed to cache GET responses
            cache: true,
            //Used to handle the raw response data of XMLHttpRequest.
            //This is a pre-filtering function to sanitize the response.
            //The sanitized response should be returned
            dataFilter: empty
        }

        function mimeToDataType(mime) {
            if (mime) mime = mime.split(';', 2)[0]
            return mime && (mime == htmlType ? 'html' :
                mime == jsonType ? 'json' :
                scriptTypeRE.test(mime) ? 'script' :
                xmlTypeRE.test(mime) && 'xml') || 'text'
        }

        function appendQuery(url, query) {
            if (query == '') return url
            return (url + '&' + query).replace(/[&?]{1,2}/, '?')
        }

        // serialize payload and append it to the URL for GET requests
        function serializeData(options) {
            if (options.processData && options.data && $.type(options.data) != "string")
                options.data = $.param(options.data, options.traditional)
            if (options.data && (!options.type || options.type.toUpperCase() == 'GET' || 'jsonp' == options.dataType))
                options.url = appendQuery(options.url, options.data), options.data = undefined
        }

        $.ajax = function(options) {
            var settings = $.extend({}, options || {}),
                deferred = $.Deferred && $.Deferred(),//默认不带Deferred功能
                urlAnchor, hashIndex
            for (key in $.ajaxSettings)
                if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]//拷贝默认属性

            ajaxStart(settings)

            if (!settings.crossDomain) {
                urlAnchor = document.createElement('a')
                urlAnchor.href = settings.url
                    // cleans up URL for .href (IE only), see https://github.com/madrobby/zepto/pull/1049
                urlAnchor.href = urlAnchor.href
                settings.crossDomain = (originAnchor.protocol + '//' + originAnchor.host) !== (urlAnchor.protocol + '//' + urlAnchor.host)
            }

            if (!settings.url) settings.url = window.location.toString()
            if ((hashIndex = settings.url.indexOf('#')) > -1) settings.url = settings.url.slice(0, hashIndex)
            serializeData(settings)

            var dataType = settings.dataType,
                hasPlaceholder = /\?.+=\?/.test(settings.url)
            if (hasPlaceholder) dataType = 'jsonp'

            if (settings.cache === false || (
                    (!options || options.cache !== true) &&
                    ('script' == dataType || 'jsonp' == dataType)
                ))
                settings.url = appendQuery(settings.url, '_=' + Date.now())

            if ('jsonp' == dataType) {
                if (!hasPlaceholder)
                    settings.url = appendQuery(settings.url,
                        settings.jsonp ? (settings.jsonp + '=?') : settings.jsonp === false ? '' : 'callback=?')
                return $.ajaxJSONP(settings, deferred)
            }

            var mime = settings.accepts[dataType],
                headers = {},
                setHeader = function(name, value) { headers[name.toLowerCase()] = [name, value] },
                protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
                xhr = settings.xhr(),
                nativeSetHeader = xhr.setRequestHeader,
                abortTimeout

            if (deferred) deferred.promise(xhr)

            if (!settings.crossDomain) setHeader('X-Requested-With', 'XMLHttpRequest')
            setHeader('Accept', mime || '*/*')
            if (mime = settings.mimeType || mime) {
                if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
                xhr.overrideMimeType && xhr.overrideMimeType(mime)
            }
            if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
                setHeader('Content-Type', settings.contentType || 'application/x-www-form-urlencoded')

            if (settings.headers)
                for (name in settings.headers) setHeader(name, settings.headers[name])
            xhr.setRequestHeader = setHeader

            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    xhr.onreadystatechange = empty
                    clearTimeout(abortTimeout)
                    var result, error = false
                    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
                        dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'))

                        if (xhr.responseType == 'arraybuffer' || xhr.responseType == 'blob')
                            result = xhr.response
                        else {
                            result = xhr.responseText

                            try {
                                // http://perfectionkills.com/global-eval-what-are-the-options/
                                // sanitize response accordingly if data filter callback provided
                                result = ajaxDataFilter(result, dataType, settings)
                                if (dataType == 'script')(1, eval)(result)//不明白什么意思。大概明白-20170214
                                else if (dataType == 'xml') result = xhr.responseXML
                                else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
                            } catch (e) { error = e }

                            if (error) return ajaxError(error, 'parsererror', xhr, settings, deferred)
                        }

                        ajaxSuccess(result, xhr, settings, deferred)
                    } else {
                        ajaxError(xhr.statusText || null, xhr.status ? 'error' : 'abort', xhr, settings, deferred)
                    }
                }
            }

            if (ajaxBeforeSend(xhr, settings) === false) {
                xhr.abort()
                ajaxError(null, 'abort', xhr, settings, deferred)
                return xhr
            }

            var async = 'async' in settings ? settings.async : true
            xhr.open(settings.type, settings.url, async, settings.username, settings.password)

            if (settings.xhrFields)
                for (name in settings.xhrFields) xhr[name] = settings.xhrFields[name]

            for (name in headers) nativeSetHeader.apply(xhr, headers[name])

            if (settings.timeout > 0) abortTimeout = setTimeout(function() {
                xhr.onreadystatechange = empty
                xhr.abort()
                ajaxError(null, 'timeout', xhr, settings, deferred)
            }, settings.timeout)

            // avoid sending empty string (#319)
            xhr.send(settings.data ? settings.data : null)
            return xhr
        }

        // handle optional data/success arguments
        function parseArguments(url, data, success, dataType) {
            if ($.isFunction(data)) dataType = success, success = data, data = undefined
            if (!$.isFunction(success)) dataType = success, success = undefined
            return {
                url: url,
                data: data,
                success: success,
                dataType: dataType
            }
        }

        $.get = function( /* url, data, success, dataType */ ) {
            return $.ajax(parseArguments.apply(null, arguments))
        }

        $.post = function( /* url, data, success, dataType */ ) {
            var options = parseArguments.apply(null, arguments)
            options.type = 'POST'
            return $.ajax(options)
        }

        $.getJSON = function( /* url, data, success */ ) {
            var options = parseArguments.apply(null, arguments)
            options.dataType = 'json'
            return $.ajax(options)
        }

        $.fn.load = function(url, data, success) {
            if (!this.length) return this
            var self = this,
                parts = url.split(/\s/),
                selector,
                options = parseArguments(url, data, success),
                callback = options.success
            if (parts.length > 1) options.url = parts[0], selector = parts[1]
            options.success = function(response) {
                self.html(selector ?
                    $('<div>').html(response.replace(rscript, "")).find(selector) :
                    response)
                callback && callback.apply(self, arguments)
            }
            $.ajax(options)
            return this
        }

        var escape = encodeURIComponent

        function serialize(params, obj, traditional, scope) {
            var type, array = $.isArray(obj),
                hash = $.isPlainObject(obj)
            $.each(obj, function(key, value) {
                type = $.type(value)
                if (scope) key = traditional ? scope :
                    scope + '[' + (hash || type == 'object' || type == 'array' ? key : '') + ']'
                    // handle data in serializeArray() format
                if (!scope && array) params.add(value.name, value.value)
                    // recurse into nested objects
                else if (type == "array" || (!traditional && type == "object"))
                    serialize(params, value, traditional, key)
                else params.add(key, value)
            })
        }

        $.param = function(obj, traditional) {
            var params = []
            params.add = function(key, value) {
                if ($.isFunction(value)) value = value()
                if (value == null) value = ""
                this.push(escape(key) + '=' + escape(value))
            }
            serialize(params, obj, traditional)
            return params.join('&').replace(/%20/g, '+')
        }
    })(Zepto)

    //表单的处理
    ;
    (function($) {
        /**
         * 序列化为数组
         * 使用name属性作为key，value作为值
         */
        $.fn.serializeArray = function() {
            var name, type, result = [],
                add = function(value) {
                    if (value.forEach) return value.forEach(add)
                    result.push({ name: name, value: value })
                }
            if (this[0]) $.each(this[0].elements, function(_, field) {
                type = field.type, name = field.name
                if (name && field.nodeName.toLowerCase() != 'fieldset' &&
                    !field.disabled && type != 'submit' && type != 'reset' && type != 'button' && type != 'file' &&
                    ((type != 'radio' && type != 'checkbox') || field.checked))
                    add($(field).val())
            })
            return result
        }

        /**
         * 序列化为参数的形式 paramName=paramValue
         */
        $.fn.serialize = function() {
            var result = []
            this.serializeArray().forEach(function(elm) {
                result.push(encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value))
            })
            return result.join('&')
        }

        /**
         * 表单提交
         */
        $.fn.submit = function(callback) {
            if (0 in arguments) this.bind('submit', callback)
            else if (this.length) {
                var event = $.Event('submit')
                this.eq(0).trigger(event)
                if (!event.isDefaultPrevented()) this.get(0).submit()
            }
            return this
        }

    })(Zepto)

    ;
    (function() {
        // getComputedStyle shouldn't freak out when called
        // without a valid element as argument
        //如果getComputeStyle传入参数有误时抛出异常，则
        //处理getComputeStyle的异常，将默认的getComputedStyle包裹一层；
        try {
            getComputedStyle(undefined)
        } catch (e) {
            var nativeGetComputedStyle = getComputedStyle
            window.getComputedStyle = function(element, pseudoElement) {
                try {
                    return nativeGetComputedStyle(element, pseudoElement)
                } catch (e) {
                    return null
                }
            }
        }
    })()
    return Zepto
}))