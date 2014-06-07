// From MightTable by Rodrigo B. de Oliveira (Bamboo)
// Based on python mode by Chris Granger

CodeMirror.defineMode("metascript", function(conf, parserConf) {
    var ERRORCLASS = 'error';

    function orRegexp(patterns) {
      return "(" + patterns.join(")|(") + ")";
    }

    function wordRegexp(words, specialWords) {
        var wordsPattern = "(" + orRegexp(words) + ")\\b";
        return specialWords
          ? new RegExp("^" + orRegexp([orRegexp(specialWords), wordsPattern]))
          : new RegExp("^" + wordsPattern);
    }


    var unquoteOperators = new RegExp("^((~`)|`)");
    var operatorSet = "-\\+\\*/%&|\\^~=<>!";
    var operators = parserConf.operators || new RegExp('^[' + operatorSet + '][' + operatorSet + '\\.]*');
    var singleDelimiters = parserConf.singleDelimiters || new RegExp('^[\\(\\)\\[\\]\\{\\}@,:=;\\.]');
    var doubleDelimiters = parserConf.doubleDelimiters || new RegExp("^((\\+=)|(\\-=)|(\\*=)|(%=)|(/=)|(&=)|(\\|=)|(\\^=))");
    var tripleDelimiters = parserConf.tripleDelimiters || new RegExp("^((//=)|(>>=)|(<<=)|(\\*\\*=))");
    var identifiers = parserConf.identifiers || new RegExp("^[\\\\]?[#_A-Za-z\\-][_A-Za-z0-9>\\-]*[!?]?");
    var identifierSuffix = new RegExp("^([!?]|([_A-Za-z0-9\\->]+[!?]?))");

    var wordOperators = wordRegexp(['typeof', 'instanceof']);
    var specialKeywords = ['next\\!', 'end\\!',
                          'do\\!', 'give\\!'];
    var commonkeywords = ['var', 'const', 'try', 'catch', 'throw', 'finally',
                          'if', 'else', 'loop', 'do', 'return', 'new',
                          'fun', 'delete', 'this'];
    var commonBuiltins = ['require', '#external',
                          'Object', 'Array', 'String',
                          'Error', 'Math', 'JSON', 'RegExp', 'void'];
    var stringPrefixes = new RegExp("^('{3}|\"{3}|['\"])");
    keywords = wordRegexp(commonkeywords, specialKeywords);
    builtins = wordRegexp(commonBuiltins);

    var atoms = wordRegexp(['true', 'false', 'null', 'undefined', 'NaN']);

    var indentInfo = null;

    // tokenizers
    function isDef(stream, state) {
      var lt = state.lastToken;
      return stream.peek() == ':'
        || (lt && (lt == 'var'
                   || lt == 'const'
                   || lt == 'fun'
                   || lt == '#keepmacro'
                   || lt.startsWith('#def')));
    }

    function orIdentifier(stream, state, pattern, style) {
      if (stream.match(pattern)) {
        if (stream.match(identifierSuffix))
          return isDef(stream, state) ? 'def' : 'identifier';
        return style;
      }
      return undefined;
    }

    function tokenBase(stream, state) {
        // Handle scope changes
        if (stream.sol()) {
            var scopeOffset = state.scopes[0].offset;
            if (stream.eatSpace()) {
                var lineOffset = stream.indentation();
                if (lineOffset > scopeOffset) {
                    indentInfo = 'indent';
                } else if (lineOffset < scopeOffset) {
                    indentInfo = 'dedent';
                }
                return null;
            } else {
                if (scopeOffset > 0) {
                    dedent(stream, state);
                }
            }
        }
        if (stream.eatSpace()) {
            return null;
        }

        var ch = stream.peek();

        // Handle Comments
        if (ch === ';') {
            stream.skipToEnd();
            return 'comment';
        }

        // Handle Number Literals
        if (stream.match(/^[0-9\.]/, false)) {
            var floatLiteral = false;
            // Floats
            if (stream.match(/^\d*\.\d+(e[\+\-]?\d+)?/i)) { floatLiteral = true; }
            if (stream.match(/^\d+\.\d*/)) { floatLiteral = true; }
            if (stream.match(/^\.\d+/)) { floatLiteral = true; }
            if (floatLiteral) {
                // Float literals may be "imaginary"
                stream.eat(/J/i);
                return 'number';
            }
            // Integers
            var intLiteral = false;
            // Hex
            if (stream.match(/^0x[0-9a-f]+/i)) { intLiteral = true; }
            // Binary
            if (stream.match(/^0b[01]+/i)) { intLiteral = true; }
            // Octal
            if (stream.match(/^0o[0-7]+/i)) { intLiteral = true; }
            // Decimal
            if (stream.match(/^[1-9]\d*(e[\+\-]?\d+)?/)) {
                // Decimal literals may be "imaginary"
                stream.eat(/J/i);
                // TODO - Can you have imaginary longs?
                intLiteral = true;
            }
            // Zero by itself with no other piece of number.
            if (stream.match(/^0(?![\dx])/i)) { intLiteral = true; }
            if (intLiteral) {
                // Integer literals may be "long"
                stream.eat(/L/i);
                return 'number';
            }
        }

        // Handle Strings
        if (stream.match(stringPrefixes)) {
            state.tokenize = tokenStringFactory(stream.current());
            return state.tokenize(stream, state);
        }

        // Handle operators and Delimiters
        if (stream.match(tripleDelimiters) || stream.match(doubleDelimiters)) {
            return null;
        }

        if (stream.match(unquoteOperators))
             return 'meta';

        if (stream.match(singleDelimiters)) {
            return null;
        }

        var keywordOrIdentifier = orIdentifier(stream, state, keywords, 'keyword');
        if (keywordOrIdentifier) {
          return keywordOrIdentifier;
        }

        var builtinOrIdentifier = orIdentifier(stream, state, builtins, 'builtin');
        if (builtinOrIdentifier) {
          return builtinOrIdentifier;
        }

        var atomOrIdentifier = orIdentifier(stream, state, atoms, 'atom');
        if (atomOrIdentifier) {
          return atomOrIdentifier;
        }

        var operatorOrIdentifier = orIdentifier(stream, state, wordOperators, 'operator');
        if (operatorOrIdentifier) {
          return operatorOrIdentifier;
        }

        var startingChar = stream.peek();
        if (stream.match(identifiers)) {
          if (stream.current() == '->')
            return 'operator';
          if (isDef(stream, state))
            return 'def';
          return (startingChar == '#' || startingChar == '\\')
            ? 'meta'
            : 'identifier';
        }

        if (stream.match(operators)) {
            return 'operator';
        }


        // Handle non-detected items
        stream.next();
        return ERRORCLASS;
    }


    function tokenStringFactory(delimiter) {
        var singleline = delimiter.length == 1;
        var OUTCLASS = 'string';

        function tokenString(stream, state) {
            while (!stream.eol()) {
                stream.eatWhile(/[^'"\\]/);
                if (stream.eat('\\')) {
                    stream.next();
                    if (singleline && stream.eol()) {
                        return OUTCLASS;
                    }
                } else if (stream.match(delimiter)) {
                    state.tokenize = tokenBase;
                    return OUTCLASS;
                } else {
                    stream.eat(/['"]/);
                }
            }
            if (singleline) {
                if (parserConf.singleLineStringErrors) {
                    return ERRORCLASS;
                } else {
                    state.tokenize = tokenBase;
                }
            }
            return OUTCLASS;
        }
        tokenString.isString = true;
        return tokenString;
    }

    function indent(stream, state, type) {
        type = type || 'py';
        var indentUnit = 0;
        if (type === 'py') {
            if (state.scopes[0].type !== 'py') {
                state.scopes[0].offset = stream.indentation();
                return;
            }
            for (var i = 0; i < state.scopes.length; ++i) {
                if (state.scopes[i].type === 'py') {
                    indentUnit = state.scopes[i].offset + conf.indentUnit;
                    break;
                }
            }
        } else {
            indentUnit = stream.column() + stream.current().length;
        }
        state.scopes.unshift({
            offset: indentUnit,
            type: type
        });
    }

    function dedent(stream, state, type) {
        type = type || 'py';
        if (state.scopes.length == 1) return;
        if (state.scopes[0].type === 'py') {
            var _indent = stream.indentation();
            var _indent_index = -1;
            for (var i = 0; i < state.scopes.length; ++i) {
                if (_indent === state.scopes[i].offset) {
                    _indent_index = i;
                    break;
                }
            }
            if (_indent_index === -1) {
                return true;
            }
            while (state.scopes[0].offset !== _indent) {
                state.scopes.shift();
            }
            return false;
        } else {
            if (type === 'py') {
                state.scopes[0].offset = stream.indentation();
                return false;
            } else {
                if (state.scopes[0].type != type) {
                    return true;
                }
                state.scopes.shift();
                return false;
            }
        }
    }

    function tokenLexer(stream, state) {
        indentInfo = null;
        var style = state.tokenize(stream, state);
        var current = stream.current();

        // Handle '.' connected identifiers
        if (current === '.') {
            style = stream.match(identifiers, false) ? null : ERRORCLASS;
            if (style === null && state.lastStyle === 'meta') {
                // Apply 'meta' style to '.' connected identifiers when
                // appropriate.
                style = 'meta';
            }
            return style;
        }

        if ((style === 'variable' || style === 'builtin')
            && state.lastStyle === 'meta') {
            style = 'meta';
        }

        // Handle scope changes.
        if (current === 'pass' || current === 'return') {
            state.dedent += 1;
        }
        if (current === 'lambda') state.lambda = true;
        if ((current === ':' && !state.lambda && state.scopes[0].type == 'py')
            || indentInfo === 'indent') {
            indent(stream, state);
        }
        var delimiter_index = '[({'.indexOf(current);
        if (delimiter_index !== -1) {
            style = 'bracket';
            indent(stream, state, '])}'.slice(delimiter_index, delimiter_index+1));
        }
        if (indentInfo === 'dedent') {
            if (dedent(stream, state)) {
                return ERRORCLASS;
            }
        }
        delimiter_index = '])}'.indexOf(current);
        if (delimiter_index !== -1) {
            if (dedent(stream, state, current)) {
                return ERRORCLASS;
            }
          style = 'bracket';
        }
        if (state.dedent > 0 && stream.eol() && state.scopes[0].type == 'py') {
            if (state.scopes.length > 1) state.scopes.shift();
            state.dedent -= 1;
        }

        return style;
    }

    var external = {
        startState: function(basecolumn) {
            return {
              tokenize: tokenBase,
              scopes: [{offset:basecolumn || 0, type:'py'}],
              lastStyle: null,
              lastToken: null,
              lambda: false,
              dedent: 0
          };
        },

        token: function(stream, state) {
            var style = tokenLexer(stream, state);

            state.lastStyle = style;

            var current = stream.current();
            if (current && style) {
                state.lastToken = current;
            }

            if (stream.eol() && state.lambda) {
                state.lambda = false;
            }
            return style;
        },

        indent: function(state) {
            if (state.tokenize != tokenBase) {
                return state.tokenize.isString ? CodeMirror.Pass : 0;
            }

            return state.scopes[0].offset;
        },

        lineComment: ";",
        fold: "indent"
    };
    return external;
});

CodeMirror.defineMIME("text/x-metascript", "metascript");
