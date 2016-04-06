dist: src/*.js
	cat build/head src/jsDAVlib.js src/jsDAVCommunications.js src/jsDAVConnection.js src/jsDAVResource.js src/jsDAVXMLParser.js build/tail > dist/jsDAVlib.js

all: clean
	@echo "Preparing test application"
	@git submodule update --init --recursive
	@cp -al src/ test/js/lib

clean:
	@echo "Cleaning ..."
	@rm -rf test/js/lib
	@rm -f jsDAVlib.zip

app: all
	@echo "Creating package ..."
	@cd test; zip -r ../jsDAVlib.zip *

