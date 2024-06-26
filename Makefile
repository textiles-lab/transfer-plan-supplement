#PLANNERS = cse exhaustive-firsts schoolbus schoolbus-sliders
all: gen_laces cse  sb sbb  stats 
opt: gen_laces opt-run opt-stats

gen_laces: longer-laces.js
	./longer-laces.js

csvs:
	mkdir csvs

cse: cse.js
	./cse.js data/enum-laces-6

opt-run: exhaustive-firsts.js exhaustive-search.cpp
	g++ -std=c++11 -O3 exhaustive-search.cpp -o exhaustive  
	./exhaustive-firsts.js data/enum-laces-6

sb: schoolbus.js
	./schoolbus.js data/enum-laces-6

sbb: schoolbus-sliders.js
	./schoolbus-sliders.js data/enum-laces-6

stats: generate-stats.js
	./generate-stats.js results/cse
	./generate-stats.js results/schoolbus
	./generate-stats.js results/schoolbus-sliders

opt-stats: generate-stats.js
	./generate-stats.js results/exhaustive-firsts

#$(PLANNERS): $(PLANNERS).js
#	./$(PLANNERS).js data/enum-lace-6
	#./generate-stats.js results/$(PLANNERS)
		
clean:
	rm -rf results
	rm -rf csvs
	rm -rf data/enum-laces-6

