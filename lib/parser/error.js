"use strict";
var parsimmon_1 = require("parsimmon");
var combinator_1 = require("./combinator");
var _a = require('atom'), Point = _a.Point, Range = _a.Range;
var path_1 = require("path");
////////////////////////////////////////////////////////////////////////////////
//  Error
////////////////////////////////////////////////////////////////////////////////
var singleLineRange = parsimmon_1.seq(parsimmon_1.digits, parsimmon_1.string(","), parsimmon_1.digits, parsimmon_1.string("-"), parsimmon_1.digits).map(function (result) {
    var row = parseInt(result[0]) - 1;
    var start = new Point(row, parseInt(result[2]) - 1);
    var end = new Point(row, parseInt(result[4]) - 1);
    return [new Range(start, end), true];
});
var multiLineRange = parsimmon_1.seq(parsimmon_1.digits, parsimmon_1.string(","), parsimmon_1.digits, parsimmon_1.string("-"), parsimmon_1.digits, parsimmon_1.string(","), parsimmon_1.digits).map(function (result) {
    var start = new Point(parseInt(result[0]) - 1, parseInt(result[2]) - 1);
    var end = new Point(parseInt(result[4]) - 1, parseInt(result[6]) - 1);
    return [new Range(start, end), false];
});
var range = parsimmon_1.alt(multiLineRange, singleLineRange).skip(combinator_1.spaces);
var location = parsimmon_1.seq(parsimmon_1.takeWhile(function (c) { return c !== ":"; }), parsimmon_1.string(":"), range).map(function (result) {
    return {
        path: path_1.normalize(result[0]),
        range: result[2][0],
        isSameLine: result[2][1]
    };
}).skip(combinator_1.spaces);
var didYouMean = parsimmon_1.alt(parsimmon_1.seq(combinator_1.token("(did you mean"), parsimmon_1.sepBy1(parsimmon_1.regex(/'.*'/).skip(combinator_1.spaces), combinator_1.token("or")), combinator_1.token("?)")), parsimmon_1.succeed([[], []])).map(function (result) {
    return result[1].map(function (s) { return s.substr(1, s.length - 2); }); // remove single quotes
}).skip(combinator_1.spaces);
var notInScope = parsimmon_1.seq(location, combinator_1.token("Not in scope:").then(combinator_1.trimBeforeAndSkip("at")).skip(location), didYouMean, parsimmon_1.all).map(function (result) {
    return {
        kind: "NotInScope",
        expr: result[1],
        location: result[0],
        suggestion: result[2]
    };
});
var typeMismatch = parsimmon_1.seq(location, parsimmon_1.alt(combinator_1.trimBeforeAndSkip("!=<"), combinator_1.trimBeforeAndSkip("=<"), combinator_1.trimBeforeAndSkip("!=")), combinator_1.trimBeforeAndSkip("of type"), combinator_1.trimBeforeAndSkip("when checking that the expression"), combinator_1.trimBeforeAndSkip("has type"), parsimmon_1.all).map(function (result) {
    return {
        kind: "TypeMismatch",
        actual: result[1],
        expected: result[2],
        expectedType: result[3],
        expr: result[4],
        exprType: result[5],
        location: result[0]
    };
});
var definitionTypeMismatch = parsimmon_1.seq(location, parsimmon_1.alt(combinator_1.trimBeforeAndSkip("!=<"), combinator_1.trimBeforeAndSkip("=<"), combinator_1.trimBeforeAndSkip("!=")), combinator_1.trimBeforeAndSkip("of type"), combinator_1.trimBeforeAndSkip("when checking the definition of"), parsimmon_1.all).map(function (result) {
    return {
        kind: "DefinitionTypeMismatch",
        actual: result[1],
        expected: result[2],
        expectedType: result[3],
        expr: result[4],
        location: result[0]
    };
});
var badConstructor = parsimmon_1.seq(location, combinator_1.token("The constructor").then(combinator_1.trimBeforeAndSkip("does not construct an element of")), combinator_1.trimBeforeAndSkip("when checking that the expression"), combinator_1.trimBeforeAndSkip("has type"), parsimmon_1.all).map(function (result) {
    return {
        kind: "BadConstructor",
        location: result[0],
        constructor: result[1],
        constructorType: result[2],
        expr: result[3],
        exprType: result[4]
    };
});
var rhsOmitted = parsimmon_1.seq(location, combinator_1.token("The right-hand side can only be omitted if there is an absurd"), combinator_1.token("pattern, () or {}, in the left-hand side."), combinator_1.token("when checking that the clause"), combinator_1.trimBeforeAndSkip("has type"), parsimmon_1.all).map(function (result) {
    return {
        kind: "RHSOmitted",
        location: result[0],
        expr: result[4],
        exprType: result[5]
    };
});
var missingType = parsimmon_1.seq(location, combinator_1.token("Missing type signature for left hand side"), combinator_1.trimBeforeAndSkip("when scope checking the declaration"), parsimmon_1.all).map(function (result) {
    return {
        kind: "MissingType",
        location: result[0],
        expr: result[2]
    };
});
var multipleDefinition = parsimmon_1.seq(location, combinator_1.token("Multiple definitions of"), combinator_1.trimBeforeAndSkip(". Previous definition at"), location, combinator_1.token("when scope checking the declaration"), combinator_1.trimBeforeAndSkip(":"), parsimmon_1.all).map(function (result) {
    return {
        kind: "MultipleDefinition",
        location: result[0],
        locationPrev: result[3],
        expr: result[2],
        decl: result[5],
        declType: result[6]
    };
});
var missingDefinition = parsimmon_1.seq(location, combinator_1.token("Missing definition for").then(parsimmon_1.all)).map(function (result) {
    return {
        kind: "MissingDefinition",
        location: result[0],
        expr: result[1]
    };
});
var termination = parsimmon_1.seq(location, combinator_1.token("Termination checking failed for the following functions:"), combinator_1.trimBeforeAndSkip("Problematic calls:"), parsimmon_1.seq(combinator_1.trimBeforeAndSkip("(at"), location.skip(combinator_1.token(")"))).map(function (result) {
    return {
        expr: result[0],
        location: result[1]
    };
}).atLeast(1)).map(function (result) {
    return {
        kind: "Termination",
        location: result[0],
        expr: result[2],
        calls: result[3]
    };
});
var constructorTarget = parsimmon_1.seq(location, combinator_1.token("The target of a constructor must be the datatype applied to its"), combinator_1.token("parameters,").then(combinator_1.trimBeforeAndSkip("isn't")), combinator_1.token("when checking the constructor").then(combinator_1.trimBeforeAndSkip("in the declaration of")), parsimmon_1.all).map(function (result) {
    return {
        kind: "ConstructorTarget",
        location: result[0],
        expr: result[2],
        ctor: result[3],
        decl: result[4]
    };
});
var functionType = parsimmon_1.seq(location, combinator_1.trimBeforeAndSkip("should be a function type, but it isn't"), combinator_1.token("when checking that").then(combinator_1.trimBeforeAndSkip("is a valid argument to a function of type")), parsimmon_1.all).map(function (result) {
    return {
        kind: "FunctionType",
        location: result[0],
        expr: result[2],
        exprType: result[1]
    };
});
var moduleMismatch = parsimmon_1.seq(combinator_1.token("You tried to load").then(combinator_1.trimBeforeAndSkip("which defines")), combinator_1.token("the module").then(combinator_1.trimBeforeAndSkip(". However, according to the include path this module")), combinator_1.token("should be defined in").then(parsimmon_1.all)).map(function (result) {
    return {
        kind: "ModuleMismatch",
        wrongPath: result[0],
        rightPath: result[2],
        moduleName: result[1]
    };
});
var parse = parsimmon_1.seq(location, combinator_1.trimBeforeAndSkip(": ").then(combinator_1.trimBeforeAndSkip("..."))).map(function (result) {
    var i = result[1].indexOf("\n");
    return {
        kind: "Parse",
        location: result[0],
        message: result[1].substring(0, i),
        expr: result[1].substring(i + 1)
    };
});
var caseSingleHole = parsimmon_1.seq(location, combinator_1.token("Right hand side must be a single hole when making a case").then(combinator_1.token("distinction")), combinator_1.token("when checking that the expression"), combinator_1.trimBeforeAndSkip("has type"), parsimmon_1.all).map(function (result) {
    return {
        kind: "CaseSingleHole",
        location: result[0],
        expr: result[3],
        exprType: result[4]
    };
});
var patternMatchOnNonDatatype = parsimmon_1.seq(location, combinator_1.token("Cannot pattern match on non-datatype").then(combinator_1.trimBeforeAndSkip("when checking that the expression")), combinator_1.trimBeforeAndSkip("has type"), parsimmon_1.all).map(function (result) {
    return {
        kind: "PatternMatchOnNonDatatype",
        location: result[0],
        nonDatatype: result[1],
        expr: result[2],
        exprType: result[3]
    };
});
var unparsed = parsimmon_1.all.map(function (result) {
    return {
        kind: "Unparsed",
        input: result
    };
});
var errorParser = parsimmon_1.alt(notInScope, typeMismatch, definitionTypeMismatch, badConstructor, rhsOmitted, missingType, multipleDefinition, missingDefinition, termination, constructorTarget, functionType, moduleMismatch, parse, caseSingleHole, patternMatchOnNonDatatype, unparsed);
function parseError(input) {
    return errorParser.parse(input).value;
}
exports.parseError = parseError;