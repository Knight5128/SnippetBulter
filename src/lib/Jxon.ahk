#Requires AutoHotkey v2.0
; Jxon - JSON交互库，源自https://github.com/TheArkive/JXON_ahk2

; ==================== JSON数据处理函数 ====================

Jxon_Load(&src, args*) {
    key := "", is_key := false
    stack := [ tree := [] ]
    next := '"{[01234567890-tfn'
    pos := 0
    
    while ((ch := SubStr(src, ++pos, 1)) != "") {
        if InStr(" `t`n`r", ch)
            continue
        if !InStr(next, ch, true) {
            testArr := StrSplit(SubStr(src, 1, pos), "`n")
            
            ln := testArr.Length
            col := pos - InStr(src, "`n",, -(StrLen(src)-pos+1))
            
            msg := Format("{}: line {} col {} (char {})"
            ,   (next == "") ? ["Extra data", ch := SubStr(src, pos)][1]
              : (next == "'") ? "Unterminated string starting at"
              : (next == "\") ? "Invalid \escape"
              : (next == ":") ? "Expecting ':' delimiter"
              : (next == '"') ? "Expecting object key enclosed in double quotes"
              : (next == '"}') ? "Expecting object key enclosed in double quotes or object closing '}'"
              : (next == ",}") ? "Expecting ',' delimiter or object closing '}'"
              : (next == ",]") ? "Expecting ',' delimiter or array closing ']'"
              : [ "Expecting JSON value(string, number, [true, false, null], object or array)"
                , ch := SubStr(src, pos, (SubStr(src, pos)~="[\]\},\s]|$")-1) ][1]
            , ln, col, pos)
            
            throw Error(msg, -1, ch)
        }
        
        obj := stack[1]
        is_array := (obj is Array)
        
        if i := InStr("{[", ch) { ; start new object / map?
            val := (i = 1) ? Map() : Array()
            
            is_array ? obj.Push(val) : obj[key] := val
            stack.InsertAt(1,val)
            
            next := '"' ((is_key := (ch == "{")) ? "}" : "]")
            continue
        }
        
        if InStr("}]", ch) {
            stack.RemoveAt(1)
            next := (stack[1] == tree) ? "" : (stack[1] is Array) ? ",]" : ",}"
            continue
        }
        
        if InStr(",:", ch) {
            is_key := (!is_array && ch == ",")
            next := is_key ? '"' : '"{[0123456789-tfn'
            continue
        }
        
        if (ch == '"') {
            i := pos
            while (i := InStr(src, '"',, i+1)) {
                val := StrReplace(SubStr(src, pos+1, i-pos-1), "\\", "\u005C")
                if (SubStr(val, -1) != "\")
                    break
            }
            if !i
                throw Error("Bad string", -1, SubStr(src, pos))
            
            val := StrReplace(val, "\/", "/")
            val := StrReplace(val, '\"', '"')
            val := StrReplace(val, "\b", "`b")
            val := StrReplace(val, "\f", "`f")
            val := StrReplace(val, "\n", "`n")
            val := StrReplace(val, "\r", "`r")
            val := StrReplace(val, "\t", "`t")
            
            i := 0
            while (i := InStr(val, "\u", true, i+1)) {
                if ((esc := Abs("0x" . SubStr(val, i+2, 4))) <= 0x7F)
                    val := StrReplace(val, SubStr(val, i, 6), Chr(esc))
                else {
                    esc2 := (((esc & 0x3FF) + 0xDC00) & 0xFFFF)
                    esc  := (((esc >> 10) & 0x3F) + 0xD800) & 0xFFFF
                    val := StrReplace(val, SubStr(val, i, 6), Chr(esc) . Chr(esc2))
                }
            }
            
            pos := i ; update pos
            
            is_array ? obj.Push(val) : is_key ? (key := val) : obj[key] := val
            
            next := is_array ? ",]" : is_key ? ":" : ",}"
            continue
        }
        
        if (ch >= "0" && ch <= "9") || (ch == "-") { ; digit
            i := pos
            while (SubStr(src, ++i, 1) ~= "[\d.eE\-+]")
                continue
            
            val := (SubStr(src, pos, i-pos) ~= "^[+\-]?\d+$") ? Integer(val) : Float(val)
            
            pos := i - 1
            
            is_array ? obj.Push(val) : obj[key] := val
            
            next := is_array ? ",]" : ",}"
            continue
        }
        
        static is_word := Map("true", true, "false", false, "null", "")
        
        if InStr("tfn", ch, true) { ; true, false, null
            i := pos
            while (i <= StrLen(src) && (ch := SubStr(src, i, 1)) ~= "[a-z]")
                val .= ch, i++
            
            if !is_word.Has(val)
                throw Error("Bad word", -1, val)
            
            pos := i - 1
            
            is_array ? obj.Push(is_word[val]) : obj[key] := is_word[val]
            
            next := is_array ? ",]" : ",}"
            continue
        }
        
        throw Error("Bad value", -1, SubStr(src, pos))
    }
    
    return tree[1]
}

Jxon_Dump(obj, indent:="", lvl:=1) {
    static indent_char := "    "
    if !IsSet(indent)
        indent := ""
    
    if IsObject(obj) {
        if (obj is Array) {  ; Array
            for k, v in obj
                res .= (res ? ",`n" : "") indent_char . Jxon_Dump(v, indent_char, lvl+1)
            
            return "[`n" res "`n" indent "]"
        } else {  ; Map
            for k, v in obj
                res .= (res ? ",`n" : "") indent_char . (LTrim(k,'"')~="[.\d\[\]]" ? "[" k "]" 
                          : '"' Jxon_Escape(k) '"') ": " Jxon_Dump(v, indent_char, lvl+1)
        }
        
        return IsObject(obj) ? "{`n" res "`n" indent "}" : '"' Jxon_Escape(obj) '"'
    }
    
    return (Type(obj) == "String") ? '"' Jxon_Escape(obj) '"' : obj
}

Jxon_Escape(str) {
    if (str == "")
        return ""
        
    str := StrReplace(str, "\", "\\")
    str := StrReplace(str, "`t", "\t")
    str := StrReplace(str, "`r", "\r")
    str := StrReplace(str, "`n", "\n")
    str := StrReplace(str, "`b", "\b")
    str := StrReplace(str, "`f", "\f")
    str := StrReplace(str, "/", "\/")
    str := StrReplace(str, '"', '\"')
    
    return str
} 