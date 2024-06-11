#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"
"use strict";

var fs = require('fs');
var path = require('path');

//make laces with n stitches and offsets bounded in absolute value by 'limit'


function enumerate_laces(n, limit, save_at){
	let order = Array(n).fill(0); // doesn't matter for non-cables	

	let counter = 0;
	function write(offsets, oi, firsts, fi) {
		++counter;
		// this code should return in same index so not bothering sha256 and all that..but maybe should
		if (typeof(save_at) !== 'undefined') {
			let str = {"offsets":offsets,"firsts":firsts,"orders":order,"transferMax":limit};
			let filename = 'all' + n + '-max' + limit + '_' + oi.toString() + '_' + fi.toString() + '.xfers';
			fs.writeFileSync(path.join(save_at, filename), JSON.stringify(str) , 'utf8');
		}
	}
	
	let no_cables = [];

	//generate all patterns with no cables that stay within the range:
	let min_out = 0; //-1;
	let max_out = n-1; //n;

	let temp = [];
	function rec() {
		let min = Math.max(min_out-temp.length,-limit);
		let max = Math.min(max_out-temp.length, limit);
		if (temp.length === 0) {
			for (let o = min; o <= max; ++o) {
				temp.push(o);
				rec();
				temp.pop();
			}
		} else if (temp.length < n) {
			//how many stitches are stacked already?
			let s = temp.length-1;
			while (s - 1 >= 0 && temp[s-1]-1 === temp[s]) {
				s -= 1;
			}
			s = temp.length-s;

			min = Math.max(temp[temp.length-1] - (s < 3 ? 1 : 0), min);
			for (let o = min; o <= max; ++o) {
				temp.push(o);
				rec();
				temp.pop();
			}
		} else {
			console.assert(temp.length === n);
			no_cables.push(temp.slice());
			//console.log(temp.join(" "));
		}
	}
	rec();

	console.log("Have " + no_cables.length + " patterns before firsts.");

	no_cables.forEach(function(offsets, oi){
		//console.log(offsets.join(" "));
		let fi = 0;
		let firsts = [];
		function fill() {
			if (firsts.length < offsets.length) {
				let a = firsts.length;
				let b = a;
				while (b+1 < offsets.length && b + offsets[b] === b+1 + offsets[b+1]) b += 1;
				for (let i = a; i <= b; ++i) {
					firsts.push(false);
				}
				console.assert(firsts.length === b+1); //riiiight?
				if (a < b) {
					for (let i = a; i <= b; ++i) {
						firsts[i] = true;
						fill();
						firsts[i] = false;
					}
				} else {
					fill();
				}
				for (let i = a; i <= b; ++i) {
					firsts.pop();
				}
			} else {
				//console.log(firsts.join(" "));
				write(offsets, oi, firsts, fi++);
			}
		}
		fill();
	});

	console.log("Made " + counter + " cases.");
};
exports.enumerate_laces = enumerate_laces;
if ( require.main === module ) {
	//default parameters
	let stitches = 6;
	let rack_limit = 8;
	let dir_name = 'data/enum-laces-6';

	if (process.argv.length > 4) {
		stitches = parseInt(process.argv[2]);
		rack_limit = parseInt(process.argv[3]);
		dir_name = process.argv[4];
	}

	try {
		fs.mkdirSync(dir_name); //will this error if subdir exists?
	} catch (e) {
		if (e.code === 'EEXIST') {
			//okay; directory already exists.
		} else {
			throw e;
		}
	}
	
	//enumerate_laces(10,8);

	//enumerate_laces(6,8,'data/enum-laces-6/');
	enumerate_laces(stitches, rack_limit, dir_name);
	//enumerate_laces(10,8,'data/enum-laces-10/'); //<--- takes many gigs

}
