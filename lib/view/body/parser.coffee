_ = require 'lodash'
{Point, Range}  = require 'atom'

regexHeader = /^(Goal|Have)\: ((?:\n|.)+)/
parseHeader = (str) ->
    result = str.match regexHeader
    label: result[1]
    type: result[2]

regexOccurence = /((?:\n|.)*\S+)\s*\[ at (.+):(?:(\d+)\,(\d+)\-(\d+)\,(\d+)|(\d+)\,(\d+)\-(\d+)) \]/
parseOccurence = (str) ->
    result = str.match regexOccurence
    if result
        rowStart = if parseInt result[2] then parseInt result[2] else parseInt result[6]
        rowEnd   = if parseInt result[4] then parseInt result[4] else parseInt result[6]
        colStart = if parseInt result[3] then parseInt result[3] else parseInt result[7]
        colEnd   = if parseInt result[5] then parseInt result[5] else parseInt result[8]
        range = new Range [rowStart - 1, colStart - 1], [rowEnd - 1, colEnd - 1]

        body: result[1]
        location:
            path: result[2]
            range: range
            isSameLine: result[3] is undefined

regexGoal = /^(\?\d+) \: ((?:\n|.)+)/
parseGoal = (str) ->
    result = str.match regexGoal
    if result
        judgementType: 'goal'
        index: result[1]
        type: result[2]

regexType = /^([^\_\?].*) \: ((?:\n|.)+)/
regexType = (str) ->
    result = str.match regexType
    if result
        judgementType: 'type judgement'
        expr: result[1]
        type: result[2]

regexMeta = /^(.+) \: ((?:\n|.)+)/
parseMeta = (str) ->
    occurence = parseOccurence str
    if occurence
        result = occurence.body.match regexMeta
        if result
            judgementType: 'meta'
            index: result[1]
            type: result[2]
            location: occurence.location

regexTerm = /^((?:\n|.)+)/
parseTerm = (str) ->
    result = str.match regexTerm
    if result
        judgementType: 'term'
        expr: result[1]

regexSort = /^Sort ((?:\n|.)+)/
parseSort = (str) ->
    occurence = parseOccurence str
    if occurence
        result = occurence.body.match regexSort
        if result
            judgementType: 'sort'
            index: result[1]
            location: occurence.location

parseJudgement = (str) ->
    parseGoal(str) || regexType(str) || parseMeta(str) || parseSort(str) || parseTerm(str)

regexLocation = /(?:(.+):)?(?:(\d+)\,(\d+)\-(\d+)\,(\d+)|(\d+)\,(\d+)\-(\d+))/
parseLocation = (str) ->
    result = str.match regexLocation
    if result
        rowStart = if parseInt result[2] then parseInt result[2] else parseInt result[6]
        rowEnd   = if parseInt result[4] then parseInt result[4] else parseInt result[6]
        colStart = if parseInt result[3] then parseInt result[3] else parseInt result[7]
        colEnd   = if parseInt result[5] then parseInt result[5] else parseInt result[8]
        range = new Range [rowStart - 1, colStart - 1], [rowEnd - 1, colEnd - 1]

        path: result[1]
        range: range
        isSameLine: result[2] is undefined

################################################################################
#   Error
################################################################################

regexNotInScope = /Not in scope\:\s+((?:\n|.)*)\s+at/
parseNotInScope = (str) ->
    result = str.match regexNotInScope
    if result
        errorType: 'not in scope'
        expr: result[1]

regexTypeMismatch = /((?:\n|.)*)\s+\!\=\<?\s+((?:\n|.)*)\s+of type\s+((?:\n|.)*)\s+when checking that the expression\s+((?:\n|.)*)\s+has type\s+((?:\n|.)*)/
parseTypeMismatch = (str) ->
    result = str.match regexTypeMismatch
    if result
        errorType: 'type mismatch'
        expected: result[2]
        actual: result[1]
        type: result[3]
        expr: result[4]
        exprType: result[5]

regexWrongConstructor = /The constructor\s+((?:\n|.)*)\s+does not construct an element of\s+((?:\n|.)*)\s+when checking that the expression\s+((?:\n|.)*)\s+has type\s+((?:\n|.)*)/
parseWrongConstructor = (str) ->
    result = str.match regexWrongConstructor
    if result
        errorType: 'wrong constructor'
        constructor: result[1]
        constructorType: result[2]
        expr: result[3]
        exprType: result[4]

regexApplicationParseError = /Could not parse the application\s+((?:\n|.)*)\s+when scope checking\s+((?:\n|.)*)/
parseApplicationParseError = (str) ->
    result = str.match regexApplicationParseError
    if result
        errorType: 'application parse error'
        expr: result[1]

regexTypeinationError = /Termination checking failed for the following functions:\s+((?:\n|.)*)\s+Problematic calls:\s+((?:\n|.)*)\s+\(at (.*)\)/
parseTerminationError = (str) ->
    result = str.match regexTypeinationError
    if result
        errorType: 'termination error'
        expr: result[1]
        call: result[2]
        callLocation: parseLocation result[3]

regexMissingDefinition = /Missing definition for\s+((?:\n|.)*)/
parseMissingDefinition = (str) ->
    result = str.match regexMissingDefinition
    if result
        errorType: 'missing definition'
        expr: result[1]

regexRhsOmitted = /The right-hand side can only be omitted if there is an absurd\s*pattern\, \(\) or \{\}\, in the left-hand side\.\s*when checking that the clause\s+((?:\n|.)*)\s+has type\s+((?:\n|.)*)/
parseRhsOmitted = (str) ->
    result = str.match regexRhsOmitted
    if result
        errorType: 'rhs omitted'
        expr: result[1]
        type: result[2]

regexParseError = /Parse error\s+((?:\n|.)*)\<ERROR\>\s+((?:\n|.)*)\.\.\./
parseParseError = (str) ->
    result = str.match regexParseError
    if result
        errorType: 'parse error'
        expr: result[1]
        post: result[2]

parseUnknownError = (str) ->
    errorType: 'unknown'
    raw: str

parseError = (strings) ->

    location = parseLocation strings[0]
    if location
        bulk = _.rest(strings).join('\n')
    else
        # the first line does not contains Location
        bulk = strings.join('\n')

    result = parseNotInScope(bulk) ||
        parseTypeMismatch(bulk) ||
        parseWrongConstructor(bulk) ||
        parseApplicationParseError(bulk) ||
        parseTerminationError(bulk) ||
        parseMissingDefinition(bulk) ||
        parseRhsOmitted(bulk) ||
        parseParseError(bulk) ||
        parseUnknownError(bulk)
    result.location = location
    return result

module.exports =
    parseHeader: parseHeader
    parseError: parseError
    parseJudgement: parseJudgement