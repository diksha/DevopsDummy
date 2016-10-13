var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var faker = require("faker");
var fs = require("fs");
faker.locale = "en";
var mock = require('mock-fs');
var _ = require('underscore');
var Random = require('random-js');
var random = new Random(Random.engines.mt19937().seed(0));
//var file = "";
function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["subject.js"];
	}
	//var filePath = args[0];
	var filePath = args[0];
	file = args[0].substring(0, args[0].indexOf("."));
	//constraints(filePath);

	constraints(filePath);

	generateTestCases()

}

var engine = Random.engines.mt19937().autoSeed();

function createConcreteIntegerValue( greaterThan, constraintValue )
{
	if( greaterThan )
		return Random.integer(constraintValue,constraintValue+10)(engine);
	else
		return Random.integer(constraintValue-10,constraintValue)(engine);
}

function Constraint(properties)
{
	this.ident = properties.ident;
	this.expression = properties.expression;
	this.operator = properties.operator;
	this.value = properties.value;
	this.funcName = properties.funcName;
	// Supported kinds: "fileWithContent","fileExists"
	// integer, string, phoneNumber
	this.kind = properties.kind;
}

function fakeDemo()
{
	/*console.log( faker.phone.phoneNumber() );
	console.log( faker.phone.phoneNumberFormat() );
	console.log( faker.phone.phoneFormats() );*/
}

var functionConstraints =
{
}

var mockFileLibrary = 
{
	pathExists:
	{
		'path/fileExists': {},
		'path/newPath' : {
			'val' : 'anotherVal',
		},
	},
	fileWithContent:
	{
		pathContent: 
		{	
  			file1: 'text content',
  			file2: '',
		}
	}
};
function generatePerm(nextList, currentElement, strArray, ListNum){
	var NextstrArray = strArray;
	var localAnswer = [];
	NextstrArray.push(currentElement);

	if(nextList == null){
		localAnswer.push(NextstrArray);
		return localAnswer.slice();
	}
	var NextListNum = ListNum+1;
	for(var i=0; i<nextList.length;i++){
		var smallList = generatePerm(DataArray[NextListNum], nextList[i], NextstrArray.slice(), NextListNum)
		for(var j=0; j<smallList.length;j++){
			localAnswer.push(smallList[j]);
		}
	}
	return localAnswer;
}
var NumParams=0;
var DataArray=[];

function generateTestCases()
{
	var content = "var "+file+" = require('./"+file+".js')\nvar mock = require('mock-fs');\n";
	//var content = "var subject = require('./subject.js')\nvar mock = require('mock-fs');\n";
	for ( var funcName in functionConstraints )
	{
		var params = {};

		// initialize params
		for (var i =0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
			//params[paramName] = '\'\'';
			params[paramName] = [];
		}

		//console.log( params );

		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		// Handle global constraints...
		var fileWithContent = _.some(constraints, {kind: 'fileWithContent' });
		var pathExists      = _.some(constraints, {kind: 'fileExists' });

		// plug-in values for parameters
		for( var c = 0; c < constraints.length; c++ )
		{
			var constraint = constraints[c];
			if( params.hasOwnProperty( constraint.ident ) )
			{
				params[constraint.ident].push(constraint.value);
			}
		}
		console.log(params);
		NumParams=0;		
		DataArray=[];
		for(parameter in params){
			NumParams++;
			//console.log(parameter, params[parameter]);
			var a=[];
			for(var i=0;i<params[parameter].length;i++){
			//	console.log(params[parameter][i]);
				a.push(params[parameter][i]);
			}
			DataArray.push(a);
		}
	
		var FinalAnswer=[];
			for(var i=0; i<DataArray[0].length;i++){
				var dummyArray=[];
				var tempArray=generatePerm(DataArray[1],DataArray[0][i],dummyArray.slice(),1);
				for(var j=0; j<tempArray.length;j++){
					FinalAnswer.push(tempArray[j]);
				}
			}
			//console.log(FinalAnswer);
			
			
			for(var i=0; i<FinalAnswer.length; i++){
			var args = Object.keys(FinalAnswer[i]).map( function(k) {return FinalAnswer[i][k]; }).join(",");

		// Prepare function arguments.
		//var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");
		if( pathExists || fileWithContent )
		{
			content += generateMockFsTestCases(pathExists,fileWithContent,funcName, args);
			// Bonus...generate constraint variations test cases....
			content += generateMockFsTestCases(!pathExists,fileWithContent,funcName, args);
			content += generateMockFsTestCases(pathExists,!fileWithContent,funcName, args);
			content += generateMockFsTestCases(!pathExists,!fileWithContent,funcName, args);
		}
		else
		{
			// Emit simple test case.
			content += file+".{0}({1});\n".format(funcName, args );
			//content += "subject.{0}({1});\n".format(funcName, args );
		}
		}

	}


	fs.writeFileSync('test.js', content, "utf8");

}

function generateMockFsTestCases (pathExists,fileWithContent,funcName,args) 
{
	var testCase = "";
	// Build mock file system based on constraints.
	var mergedFS = {};
	if( pathExists )
	{
		for (var attrname in mockFileLibrary.pathExists) { mergedFS[attrname] = mockFileLibrary.pathExists[attrname]; }
	}
	if( fileWithContent )
	{
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
	}

	testCase += 
	"mock(" +
		JSON.stringify(mergedFS)
		+
	");\n";

	testCase += "\tsubject.{0}({1});\n".format(funcName, args );
	testCase+="mock.restore();\n";
	return testCase;
}

function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	traverse(result, function (node) 
	{
		if (node.type === 'FunctionDeclaration') 
		{
			var funcName = functionName(node);
			//console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.params.map(function(p) {return p.name});

			functionConstraints[funcName] = {constraints:[], params: params};

			// Check for expressions using argument.
			traverse(node, function(child)
			{
				if( child.type === 'BinaryExpression' && child.operator == "==")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: rightHand,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}),
							new Constraint(
							{
								ident: child.left.name,
								value: '"hello"',
								funcName: funcName,	
								kind: "string",
								operator : child.operator,
								expression: expression
							})
						);
					}
					if( child.left.type == 'Identifier' && child.left.name)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						var Number = '"' + "(" + String(child.right.value) + ")" + " " + "234-5678" + '"';
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[0],
								value: Number,
								funcName: funcName,
								kind: "string",
								operator : child.operator,
								expression: expression
							}));

					}

				}

				if( child.type === 'BinaryExpression' && child.operator == "<")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand)-1,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}),
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand)+1,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
					}
				}

				if( child.type === 'BinaryExpression' && child.operator == ">")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand)+1,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}),
							new Constraint(
							{
								ident: child.left.name,
								value: parseInt(rightHand)-1,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
					}
				}



				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readFileSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								value:  "'pathContent/file1'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}),
							new Constraint(
							{
								ident: params[p],
								value:  "'pathContent/file2'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}

				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readdirSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[0],
								value:  "'path/myLibrary'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}),
							new Constraint(
							{
								ident: params[0],
								value:  "'path/fileExists'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}
				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="existsSync")
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[0],
								// A fake path to a file
								value:  "'path/fileExists'",
								funcName: funcName,
								kind: "fileExists",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}

				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="replace")
				{	
					var phoneNum="'" + String(faker.phone.phoneNumber()) + "'";
					
					for( var p =0; p < params.length; p++ )
					{	
						
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								value:  phoneNum,
								funcName: funcName,
								kind: "string",
								operator : child.operator,
								expression: expression
							})
							);

					}
				}

				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="substring")
				{	var phoneNum1="'" + String(faker.phone.phoneNumber()) + "'";
					
					for( var p =0; p < params.length; p++ )
					{	
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								value:  phoneNum1,
								funcName: funcName,
								kind: "string",
								operator : child.operator,
								expression: expression
							})
							);

					}
				}


				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="indexOf" )
				{	var temp = '"' + String(child.arguments[0].value) + '"';
					for( var p =0; p < params.length; p++ )
					{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.callee.object.name,
								value:  temp,
								funcName: funcName,
								kind: "string",
								operator : child.operator,
								expression: expression
							}));
						
					}
				}
				if(child.type === 'UnaryExpression' && child.operator == '!')
				{
					if((undefined != child.argument.object) && (child.argument.type == "MemberExpression")){
						if(params.indexOf(child.argument.object.name) > -1){
							var expression = buf.substring(child.range[0], child.range[1]);
							var property = child.argument.property.name;
							var parameter;

							for(var i=0; i<params.length;i++){
								if(params[i] == child.argument.object.name){
									parameter = child.argument.object.name;
									break;
								}
							}

							functionConstraints[funcName].constraints.push(
								new Constraint(
								{
									ident: parameter,
									value: child.argument.object.name + "={" + property + ": 'Random'}",
									funcName: funcName,
									kind: "Object",
									operator: child.operator,
									expression: expression
								}));
						}
					}
				}
			});

			//console.log( functionConstraints[funcName]);

		}
	});
}

function traverse(object, visitor) 
{
    var key, child;

    visitor.call(null, object);
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

function traverseWithCancel(object, visitor)
{
    var key, child;

    if( visitor.call(null, object) )
    {
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverseWithCancel(child, visitor);
	            }
	        }
	    }
 	 }
}

function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "";
}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();
