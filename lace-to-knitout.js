#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"
"use strict";

let planners = {
	cse:function(offsets, firsts, xfer) {
		const transfers = require('./cse.js').cse_transfers;
		transfers(offsets, firsts, xfer, {}, 8);
	},
	schoolbus:function(offsets, firsts, xfer) {
		const transfers = require('./schoolbus.js').schoolbus_basic;
		transfers(offsets, -8, 8, xfer);
	},
	sbs:function(offsets, firsts, xfer) {
		const transfers = require('./schoolbus-sliders.js').schoolbus_sliders;
		transfers(offsets, firsts, xfer);
	},
};


let inFile = "";
let outFile = "";
let planner = "schoolbus";

let rowRepeats = 1;
let columnRepeats = 1;

let error = false;

for (let i = 2; i < process.argv.length; ++i) {
	function doFile() {
		if (inFile === "") inFile = process.argv[i];
		else if (outFile === "") outFile = process.argv[i];
		else {
			console.error("Extra file argument '" + process.argv[i] + "'.");
			error = true;
		}
	}
	if (process.argv[i] === "--") {
		//remaining args are filenames
		++i;
		while (i < process.argv.length) {
			doFile();
			++i;
		}
		break;
	} else if (process.argv[i].substr(0,2) === "--") {
		if (process.argv[i] === "--planner") {
			++i;
			if (i < process.argv.length) {
				if (process.argv[i] in planners) {
					planner = process.argv[i];
				} else {
					console.error("Unknown planner '" + planner + "'.");
					error = true;
				}
			} else {
				console.error("Missing planner name after --planner");
				error = true;
			}
		} else if (process.argv[i] === "--rowRepeats") {
			++i;
			rowRepeats = parseInt(process.argv[i]);
		} else if (process.argv[i] === "--columnRepeats") {
			++i;
			columnRepeats = parseInt(process.argv[i]);
		} else {
			console.error("Unrecognized argument '" + process.argv[i] + "'");
			error = true;
		}
	} else {
		doFile();
	}
}

if (inFile === "" || outFile === "") error = true;

if (error) {
	console.log("Usage:\nlace-to-knitout.js <in.lace> <out.knitout> [--rowRepeats 1] [--columnRepeats 1] [--planner name]");
	process.exit(1);
}

const fs = require('fs');

const carrier = "5";

console.log("Translating from lace in '" + inFile + "' to knitout in '" + outFile + "'.");

const KNIT = 'knit';
const XFER = 'xfer';

let steps = [];
//e.g.:
//[
//	{type:KNIT, data:["k", "k", "k", "k"]},
//	{type:XFER, offsets:[+1, 0, -1, 0], firsts:[false, false, false, false]},
//	{type:KNIT, data:["k", "k", "k", "k"]},
//];


//---------------------------------------------
//load lace file into 'steps' array:

function readLace(file){
	var steps = [];
	fs.readFileSync(file, {encoding:'utf8'}).split(/\n/).forEach(function(line, lineNumber){
		//console.log("Line: " + line);
		//comments:
		if (line.indexOf("#") !== -1) {
			line = line.substr(0, line.indexOf("#"));
		}
		var toks = [];
		var haveKP = false;
		line.split(/\s+/).forEach(function(tok){
			if (tok !== "") toks.push(tok);
			if (tok.indexOf("k") !== -1 || tok.indexOf("p") !== -1) haveKP = true;
		});
		if (toks.length === 0) return;
		//console.log("Toks: " + toks.join(","));
		var step = {line:lineNumber};
		if (haveKP) {
			//knit/purl line!
			step.type = KNIT;
			step.data = [];
			toks.forEach(function(tok){
				if (tok === "k" || tok === "p") {
					step.data.push(tok);
				} else {
					console.error("Expecting only k/p in knit line. Got '" + tok + "'.");
					throw "Invalid token.";
				}
			});
		} else {
			//transfer line!
			step.type = XFER;
			step.offsets = [];
			step.firsts = [];
			toks.forEach(function(tok){
				var m = tok.match(/^([+-]?\d+)([*]?)$/);
				if (m === null) {
					console.error("Expecting only offsets (possibly with stars) in xfer row. Got '" + tok + "'.");
					throw "Invalid token.";
				}
				step.offsets.push(parseInt(m[1]));
				step.firsts.push(m[2] === '*');
			});
		}
		steps.unshift(step);
	});
	return steps;
}

steps = readLace(inFile);

console.log("Have " + steps.length + " steps.");
console.log("Will repeat " + columnRepeats + "x" + rowRepeats + " times.");

//---------------------------------------------
//tiling:
steps.forEach(function(step){
	if (step.type === KNIT) {
		let data = [];
		for (let c = 0; c < columnRepeats; ++c) {
			data.push(...step.data);
		}
		step.data = data;
	} else if (step.type === XFER) {
		let firsts = [];
		let offsets = [];
		for (let c = 0; c < columnRepeats; ++c) {
			firsts.push(...step.firsts);
			offsets.push(...step.offsets);
		}
		step.firsts = firsts;
		step.offsets = offsets;
	} else {
		console.assert(false, "Unknown patch type.");
	}
});

let newSteps = [];
for (let r = 0; r < rowRepeats; ++r) {
	newSteps.push(...steps);
}
steps = newSteps;

let columns = 0;
let rows = 0;
steps.forEach(function(step){
	if (step.type === KNIT) {
		++rows;
		columns = Math.max(columns, step.data.length);
	}
});

console.log("After tiling, have " + rows + " rows and " + columns + " columns");

//---------------------------------------------
//actually perform steps:

var k = [];
k.push(";!knitout-2");
k.push(";;Carriers: 1 2 3 4 5 6 7 8 9 10");

k.push("x-stitch-number 95");
k.push("inhook " + carrier);

console.assert(steps[0].type === KNIT);

var min = 1;
var max = steps[0].data.length;

//cast on:
k.push("; cast on");
for (var n = max; n >= min; --n) {
	if ((max - n) % 2 === 0) {
		k.push("tuck - f" + n + " " + carrier);
	}
}
for (var n = min; n <= max; ++n) {
	if ((max - n) % 2 !== 0) {
		k.push("tuck + f" + n + " " + carrier);
	}
}
k.push("releasehook " + carrier);
function plain2() {
	for (var n = max; n >= min; --n) {
		k.push("knit - f" + n + " " + carrier);
	}
	for (var n = min; n <= max; ++n) {
		k.push("knit + f" + n + " " + carrier);
	}
}
plain2();

//some seed stitch leader:
function seed2() {
	//evens to back:
	for (var n = min; n <= max; ++n) {
		if (n % 2 === 0) k.push("xfer f" + n + " b" + n);
	}
	//knit left:
	for (var n = max; n >= min; --n) {
		k.push("knit - " + (n % 2 === 0 ? "b" : "f") + n + " " + carrier);
	}
	//evens to front:
	for (var n = min; n <= max; ++n) {
		if (n % 2 === 0) k.push("xfer b" + n + " f" + n);
	}
	//odds to back:
	for (var n = min; n <= max; ++n) {
		if (n % 2 !== 0) k.push("xfer f" + n + " b" + n);
	}
	//knit right:
	for (var n = min; n <= max; ++n) {
		k.push("knit + " + (n % 2 !== 0 ? "b" : "f") + n + " " + carrier);
	}
	//odds to front:
	for (var n = min; n <= max; ++n) {
		if (n % 2 !== 0) k.push("xfer b" + n + " f" + n);
	}
}
k.push("; bottom border");
for (var r = 0; r < 10; r += 2) {
	seed2();
}

var dir = '-'; //keep track of which direction next row is to be knit
var racking = 0; //keep track of current racking

//actual lace pattern:
steps.forEach(function(step){
	if (step.type === KNIT) {
		k.push("; knit pass [line " + step.line + "]");
		console.assert(step.data.length === (max - min) + 1);
		//move purls to back bed:
		for (var i = 0; i < step.data.length; ++i) {
			if (step.data[i] === "p") {
				k.push("xfer f" + (min+i) + " b" + (min+i));
			}
		}
		if (dir == '-') {
			for (var n = max; n >= min; --n) {
				k.push("knit - " + (step.data[n-min] === "k" ? "f" : "b") + n + " " + carrier);
			}
			dir = '+';
		} else {
			for (var n = min; n <= max; ++n) {
				k.push("knit + " + (step.data[n-min] === "k" ? "f" : "b") + n + " " + carrier);
			}
			dir = '-';
		}
		//return purls to front bed:
		for (var i = 0; i < step.data.length; ++i) {
			if (step.data[i] === "p") {
				k.push("xfer b" + (min+i) + " f" + (min+i));
			}
		}
	} else if (step.type === XFER) {
		k.push("; xfer pass [line " + step.line + "]");
		console.assert(step.offsets.length === (max - min) + 1);
		planners[planner](step.offsets, step.firsts, (fromBed, fromIndex, toBed, toIndex) => {
			const fromNeedle = fromIndex + min;
			const toNeedle = toIndex + min;
			const r = (fromBed[0] === 'b' ? toIndex - fromIndex : fromIndex - toIndex);
			if (racking !== r) {
				k.push("rack " + r);
				racking = r;
			}
			k.push("xfer " + fromBed + fromNeedle + " " + toBed + toNeedle);
		});
		if (racking !== 0) {
			k.push("rack 0");
			racking = 0;
		}
	} else {
		console.error("Unknown step type '" + step.type + "'.");
		throw "Unknown step type.";
	}
});

k.push("; top border");

//padding knits because didn't end to the right:
if (dir === '+') {
	console.warn("Pattern didn't have an even number of rows; adding an extra row of knits.");
	for (var n = min; n <= max; ++n) {
		k.push("knit + f" + n + " " + carrier);
	}
	dir = '-';
}

for (var r = 0; r < 10; r += 2) {
	seed2();
}

k.push("outhook " + carrier);

fs.writeFileSync(outFile, k.join("\n"));
