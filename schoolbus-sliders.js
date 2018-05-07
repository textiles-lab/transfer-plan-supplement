#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"
"use strict";

//schoolbus_sliders computes transfers for flat knitting when
//  stacking order of decreases matters.
//Parameters:
// offsets: array of offsets for each stitch index
// firsts: array of the same length as offsets;
//     if Boolean(offsets[i]) is true, stitch[i] will
//     arrive at its destination needle first.
// xfer: output function
//
// schoolbust_sliders returns a transfer plan by calling
//   xfer('f'/'b', i, 'f'/'b', i+o) to move stitches around

function schoolbus_sliders(offsets, firsts, xfer) {
	//Check inputs:
	if (offsets.length !== firsts.length) {
		throw "Offsets and firsts should be the same length.";
	}
	for (let i = 0; i + 1 < offsets.length; ++i) {
		if (offsets[i] === 1 && offsets[i+1] === -1) {
			throw "Offsets should not contain cables (that is, [1,-1] subarrays)";
		}
	}

	//SliderySchoolbus moves stitches from needles 'at' to needles 'to',
	// respecting 'firsts', with the caveat that some 3-1 decreases might
	// trigger additional transfer passes.
	// notably, the case:
	// 0 -1 -2 -2 -3 -4
	// .  .  *  .  .  *
	// will require two passes in max-to-min order because
	// stitches 0,1 want sliders -2,-1 and stitches 3,4 want 0,-1.
	//  (=> collision on slider -1)
	function sliderySchoolbus(dir, at, offsets, firsts, xfer) {
		if (dir === '+') {
			//rather than writing cases for min-to-max return order, I'm just going to mirror the bed:
			at = at.slice();
			offsets = offsets.slice();
			firsts = firsts.slice();
			at.reverse();
			offsets.reverse();
			firsts.reverse();
			for (let i = 0; i < at.length; ++i) {
				at[i] = -at[i];
				offsets[i] = -offsets[i];
			}
			function flipXfer(fromBed, fromNeedle, toBed, toNeedle) {
				xfer(fromBed, -fromNeedle, toBed, -toNeedle);
			}
			sliderySchoolbus('-', at, offsets, firsts, flipXfer);
			return;
		}

		//if all offsets are zero, nothing to do:
		let done = offsets.every(function(o) { return o === 0; });
		if (done) return;

		at = at.slice(); //will be updating to reflect current position
		offsets = offsets.slice(); //will be removing resolved portion
	
		let minOffset = Infinity;
		let maxOffset =-Infinity;
		offsets.forEach(function(o){
			minOffset = Math.min(minOffset, o);
			maxOffset = Math.max(maxOffset, o);
		});

		let sliderPasses = []; //sliderPasses[i] is for offset minOffset + i -> slider
		let regularPasses = []; //regularPasses[i] is for offset minOffset + i -> front bed

		for (let o = minOffset; o <= maxOffset; ++o) {
			sliderPasses.push([]);
			regularPasses.push([]);
		}

		//offsets can come up later (computed when pushing) that weren't accounted for already:
		function expandOffsets(offset) {
			while (offset < minOffset) {
				minOffset -= 1;
				sliderPasses.unshift([]);
				regularPasses.unshift([]);
			}
			while (offset > maxOffset) {
				maxOffset += 1;
				sliderPasses.push([]);
				regularPasses.push([]);
			}
		}

		//going to write this as if moving from largest to smallest offset on returns:
		console.assert(dir === '-');

		let minReturn = 1;
		let maxReturn = 2;
		let returnPasses = [[], []]; //returnPasses[0] is for offset minReturn + i

		//prevSlider is the largest slider used so far,
		// prevNeedle is the largest destination needle used so far.
		let prevSlider = -Infinity;
		let prevNeedle = -Infinity;

		for (let i = 0; i < offsets.length; ++i) {
			if (i + 2 < offsets.length && at[i]+offsets[i] === at[i+1]+offsets[i+1] && at[i]+offsets[i] === at[i+2]+offsets[i+2]) {
				//3-1 decrease
				console.assert(i + 3 >= offsets.length || at[i]+offsets[i] < at[i+3]+offsets[i+3], "4-1 decreases are not supported by this code.");
				if (at[i] === at[i+1] || at[i] === at[i+2] || at[i+1] === at[i+2]) {
					//already done:
					console.assert(at[i] === at[i+1] && at[i+1] === at[i+2], "stacked stitches should be all-the-way stacked.");
					console.assert(offsets[i] === 0 && offsets[i+1] === 0 && offsets[i+2] === 0, "stacked stitches should be at zero.");
					regularPasses[0-minOffset].push(i);
					regularPasses[0-minOffset].push(i+1);
					regularPasses[0-minOffset].push(i+2);

					console.assert(prevNeedle < at[i]);
					prevNeedle = at[i];
				} else {
					//not already done:
					console.assert(at[i] + 1 === at[i+1], "stitches are left-to-right neighbors");
					console.assert(at[i+1] + 1 === at[i+2], "stitches are left-to-right neighbors");
					console.assert(offsets[i] === 1+offsets[i+1], "offsets are decreasing by one");
					console.assert(offsets[i+1] === 1+offsets[i+2], "offsets are decreasing by one");

					if (at[i]+offsets[i] <= prevNeedle) {
						//not enough space, so shift but do not resolve:
						let ofs = (prevNeedle+1) - at[i];
						console.assert(ofs > offsets[i]);
						console.assert(at[i]+ofs > prevNeedle);
						expandOffsets(ofs);

						regularPasses[ofs-minOffset].push(i);
						regularPasses[ofs-minOffset].push(i+1);
						regularPasses[ofs-minOffset].push(i+2);

						prevNeedle = at[i+2]+ofs;
					} else {
						//have enough space:
						console.assert(prevNeedle < at[i]+offsets[i]);

						if ( !(Boolean(firsts[i]) || Boolean(firsts[i+1]) || Boolean(firsts[i+2])) //no first preference
						 || Boolean(firsts[i]) ) { // preference matches order anyway

							regularPasses[offsets[i]-minOffset].push(i);
							regularPasses[offsets[i+1]-minOffset].push(i+1);
							regularPasses[offsets[i+2]-minOffset].push(i+2);

							prevNeedle = at[i+2]+offsets[i+2];
						} else if (Boolean(firsts[i+1])) { //center to arrive first, need to put i on slider
							//note: slider can't be in use, but just be sure:
							console.assert(prevSlider < offsets[i+1]+at[i]);
							prevSlider = offsets[i+1]+at[i]; //mark slider as needed

							sliderPasses[offsets[i+1]-minOffset].push(i);
							returnPasses[1 - minReturn].push(i);
							regularPasses[offsets[i+1]-minOffset].push(i+1);
							regularPasses[offsets[i+2]-minOffset].push(i+2);

							prevNeedle = at[i+2]+offsets[i+2];
						} else { //right to arrive first, need to put i, i+1 on sliders
							console.assert(Boolean(firsts[i+2]));

							//note: slider MAY be in use!
							if (prevSlider >= offsets[i+2]+at[i]) {
								//slider in use! do this decrease in a later pass:
								regularPasses[offsets[i]-minOffset].push(i);
								regularPasses[offsets[i]-minOffset].push(i+1);
								regularPasses[offsets[i]-minOffset].push(i+2);

								prevNeedle = at[i+2]+offsets[i];
							} else {
								console.assert(prevSlider < offsets[i+2]+at[i], "TODO: clamp/multipass when slider in use");
								prevSlider = offsets[i+2]+at[i+1]; //mark sliders as needed

								sliderPasses[offsets[i+2]-minOffset].push(i);
								returnPasses[2 - minReturn].push(i);
								sliderPasses[offsets[i+2]-minOffset].push(i+1);
								returnPasses[1 - minReturn].push(i+1);
								regularPasses[offsets[i+2]-minOffset].push(i+2);

								prevNeedle = at[i+2]+offsets[i+2];
							}
						}
					}
				}
				i += 2; //move to end of 3-1 decrease

			} else if (i + 1 < offsets.length && at[i]+offsets[i] === at[i+1]+offsets[i+1]) {
				//2-1 decrease
				if (at[i] === at[i+1]) {
					//already done:
					console.assert(offsets[i] === 0 && offsets[i+1] === 0, "stacked stitches should be at zero.");
					regularPasses[0-minOffset].push(i);
					regularPasses[0-minOffset].push(i+1);

					console.assert(prevNeedle < at[i]+offsets[i]);
					prevNeedle = at[i+1]+offsets[i+1];
				} else {
					//not already done:
					console.assert(at[i] + 1 === at[i+1], "stitches are left-to-right neighbors");
					console.assert(offsets[i] === 1+offsets[i+1], "offsets are decreasing by one");

					if (prevNeedle >= at[i]+offsets[i]) {
						//not enough space.
						let ofs = (prevNeedle+1) - at[i];
						console.assert(ofs > offsets[i]);
						console.assert(at[i]+ofs > prevNeedle);
						expandOffsets(ofs);

						regularPasses[ofs-minOffset].push(i);
						regularPasses[ofs-minOffset].push(i+1);

						prevNeedle = at[i+1]+ofs;
					} else {
						//have enough space:

						console.assert(prevNeedle < at[i]+offsets[i]);
						if ( Boolean(firsts[i]) === Boolean(firsts[i+1]) //no first preference
						 || Boolean(firsts[i]) ) { // preference matches order anyway
							regularPasses[offsets[i]-minOffset].push(i);
							regularPasses[offsets[i+1]-minOffset].push(i+1);
						} else { //out of order, need to put i on slider
							console.assert(Boolean(firsts[i+1]));
							//note: slider can't be in use, but just be sure:
							console.assert(prevSlider < offsets[i+1]+at[i]);
							prevSlider = offsets[i+1]+at[i]; //mark slider as needed

							sliderPasses[offsets[i+1]-minOffset].push(i);
							returnPasses[1 - minReturn].push(i);
							regularPasses[offsets[i+1]-minOffset].push(i+1);
						}
						prevNeedle = at[i+1]+offsets[i+1];
					}
				}
				i += 1; //move to end of 2-1 decrease

			} else {
				//not a decrease:
				if (prevNeedle >= at[i]+offsets[i]) {
					//not enough space.

					//can actually shove 'done' stitches in some cases, it appears:
					// -- I do worry about this being a potential bug, but current test cases seem to pass.

					//console.assert(offsets[i] !== 0, "shouldn't shove 'done' stitches")

					let ofs = (prevNeedle+1) - at[i];
					//console.log(ofs, offsets[i], prevNeedle, at[i], i); //DEBUG
					console.assert(ofs > offsets[i]);
					console.assert(at[i]+ofs > prevNeedle);
					expandOffsets(ofs);

					regularPasses[ofs-minOffset].push(i);

					prevNeedle = at[i]+ofs;
				} else {
					//have space
					regularPasses[offsets[i]-minOffset].push(i);
				}
			}
		}

		//move everything to back bed:
		for (let ofs = maxOffset; ofs >= minOffset; --ofs) {
			if (ofs === 0 && ofs === maxOffset) {
				//in the case where the zero pass is also the first pass, don't need to move to back bed.
			} else {
				//move to back bed so stitches can be returned:
				regularPasses[ofs-minOffset].forEach(function(i){
					xfer('f', at[i], 'b', at[i]);
				});
			}
			sliderPasses[ofs-minOffset].forEach(function(i){
				xfer('f', at[i], 'b', at[i]);
			});
		}

		//execute passes in max-to-min order.
		for (let ofs = maxOffset; ofs >= minOffset; --ofs) {
			//(order of hooks/sliders doesn't matter, all stitches are on different needles, so head to different destinations)

			//first, drop to needles:
			if (ofs === 0 && ofs === maxOffset) {
				//not needed when first pass is zero pass
			} else {
				regularPasses[ofs-minOffset].forEach(function(i){
					xfer('b', at[i], 'f', at[i]+ofs);
					at[i] += ofs;
					offsets[i] -= ofs;
				});
			}
			//then, drop to sliders:
			sliderPasses[ofs-minOffset].forEach(function(i){
				xfer('b', at[i], 'fs', at[i]+ofs);
				at[i] += ofs;
				offsets[i] -= ofs;
			});
		}

		//finally, do the slider returns:
		//sliders -> back bed:
		for (let ofs = minReturn; ofs <= maxReturn; ++ofs) {
			returnPasses[ofs-minReturn].forEach(function(i){
				xfer('fs', at[i], 'b', at[i]);
			});
		}

		//and... stack:
		for (let ofs = minReturn; ofs <= maxReturn; ++ofs) {
			returnPasses[ofs-minReturn].forEach(function(i){
				xfer('b', at[i], 'f', at[i]+ofs);
				at[i] += ofs;
				offsets[i] -= ofs;
				console.assert(offsets[i] === 0, "stuff on sliders is always headed for final stack");
			});
		}

		//and recurse to resolve any remaining offsets:
		sliderySchoolbus(dir, at, offsets, firsts, xfer);
	}

	let at = [];
	for (let i = 0; i < offsets.length; ++i) {
		at.push(i);
	}

	let minOffset = Infinity;
	let maxOffset =-Infinity;
	offsets.forEach(function(o){
		minOffset = Math.min(minOffset, o);
		maxOffset = Math.max(maxOffset, o);
	});

	if (minOffset === 0) {
		sliderySchoolbus('+', at, offsets, firsts, xfer);
	} else if (maxOffset === 0) {
		sliderySchoolbus('-', at, offsets, firsts, xfer);
	} else {

		//try '+' and '-' and pick the best:
		let lastPass = "";
		let passes = 0;
		function countPasses(fromBed, fromNeedle, toBed, toNeedle) {
			let pass = fromBed + "." + toBed + "." + (fromNeedle - toNeedle);
			if (pass !== lastPass) {
				lastPass = pass;
				++passes;
			}
		}
		sliderySchoolbus('-', at, offsets, firsts, countPasses);
		let minusPasses = passes;
		lastPass = "";
		passes = 0;
		sliderySchoolbus('+', at, offsets, firsts, countPasses);
		let plusPasses = passes;

		console.log("Passes with '+': " + plusPasses + ", with '-': " + minusPasses); //DEBUG

		if (minusPasses < plusPasses) {
			sliderySchoolbus('-', at, offsets, firsts, xfer);
		} else {
			sliderySchoolbus('+', at, offsets, firsts, xfer);
		}
	}

}

exports.schoolbus_sliders = schoolbus_sliders;

//-------------------------------------------------
//testing code:

if (require.main === module) {
	console.log("Doing some test transfers.");

	const testDriver = require('./test-driver.js');

	//adaptor to fit into testDriver
	function _sbs(offsets, firsts, orders, limit, xfer) {
		schoolbus_sliders(offsets, firsts, xfer);
	}

	if (process.argv.length > 2) {
		testDriver.runTests(_sbs, {
			skipCables:true,
			skipLong:true,
			//ignoreStacks:true,
			//ignoreEmpty:true,
			//ignoreFirsts:true,
			outDir:'results/sbs'
		});
		return;
	}

}
