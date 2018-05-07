#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"
"use strict";

//basic schoolbus algorithm
function schoolbus_basic(offsets, minRacking, maxRacking, xfer){
	for (let i = 0; i < offsets.length; i++) {
		xfer('f', i, 'b', i);
	}

	var currentOffset = minRacking;
	while (currentOffset <= maxRacking) {
		for (let i = 0; i < offsets.length; i++) {
			if (offsets[i] == currentOffset) {
				xfer('b', i, 'f', i+currentOffset);
			}
		}
		currentOffset++;
	}
}

module.exports.schoolbus_basic = schoolbus_basic;

if (require.main === module) {
	console.log("Doing some test transfers.");

	const testDriver = require('./test-driver.js');

	//adaptor to fit into testDriver
	function _schoolbus_basic(offsets, firsts, orders, limit, xfer) {
		schoolbus_basic(offsets, -limit, limit, xfer);
	}

	if (process.argv.length > 2) {
		testDriver.runTests(_schoolbus_basic, {
			skipCables:true,
			skipLong:true,
			//ignoreStacks:true,
			//ignoreEmpty:true,
			ignoreFirsts:true,
			outDir:'results/schoolbus'
		});
		return;
	}

	
}
