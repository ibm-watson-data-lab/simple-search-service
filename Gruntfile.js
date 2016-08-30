module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    jshint: {
      options : {
        jshintrc: ".jshintrc",
        ignores : [ "node_modules/**/*.js" ]
      },
      src: ["Gruntfile.js", "app.js", "lib/**.js"],
    },
    jscs: {
      src: ["Gruntfile.js", "app.js", "lib/**.js"],
      options: {
        config: ".jscsrc",
        requireCurlyBraces: [ "if" ]
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-jshint");

  grunt.registerTask("default", [ "lint", "jscs" ]);

  grunt.loadNpmTasks("grunt-jscs");

  grunt.registerTask("lint", "Check for common code problems.", [ "jshint" ]);
};
