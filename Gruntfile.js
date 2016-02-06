/*eslint-disable */

var fs = require('fs');

var version = require('./package.json').version;

var HTML_HEAD = fs.readFileSync('./jsduck-config/head.html').toString();
var CSS = fs.readFileSync('./jsduck-config/style.css').toString();

/* Insure that browserify and babelify generated code does not get counted against our test coverage */
var through = require('through');
function fixBrowserifyForIstanbul(file) {
    var data = '';
    return through(write, end);

    function write (buf) {
        data += buf;
    }
    function end () {
      var lines = data.split(/\n/);

      if (file.match(/\/user.js$/)) {
        lines = lines.map(function(line) {
          if (line.match(/^\s*\*/)) return line;
          return "/* istanbul ignore next */ " + line;
        });
      } else {
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].match(/\/\*\*/)) {
            break;
          }

          lines[i] = lines[i].replace(/\sfunction/g, "/* istanbul ignore next */ function");
          lines[i] = lines[i].replace(/\(function/g, "/* istanbul ignore next */ (function");
          lines[i] = lines[i].replace(/(\{|\}) if /g, "$1 /* istanbul ignore next */ if ");
          lines[i] = lines[i].replace(/; if /g, "; /* istanbul ignore next */ if ");
          lines[i] = lines[i].replace(/(\{|\}) for /g, "$1 /* istanbul ignore next */ for ");
          lines[i] = lines[i].replace(/; for /g, "; /* istanbul ignore next */ for ");
        }
      }

       this.queue(lines.join('\n'));
       this.queue(null);
    }
}

var browsers = [
  {
    browserName: "internet explorer",
    platform: "WIN8",
    version: "10"
  },
  {
    browserName: "internet explorer",
    platform: "Windows 8.1",
    version: "11"
  },
  /* Saucelabs support lacking for this config
   {
     browserName: 'MicrosoftEdge',
     "platform": "Windows 10",
     version: '20.10240'
  },*/
  {
    browserName: 'firefox',
    version: '32',
    platform: 'OS X 10.9'
  },
   {
    browserName: 'iphone',
    version: '7.1',
    platform: 'OS X 10.9'
  },
  {
    browserName: 'chrome',
    platform: 'Linux',
    deviceName: 'Android Emulator',
    deviceOrientation: 'portrait'
  },
  {
    browserName: 'safari',
    version: '7',
    platform: 'OS X 10.9'

  }
];

module.exports = function (grunt) {

  var credentials;
  try {
    credentials = grunt.file.readJSON('./credentials.json');
  } catch (e) {
    credentials = {saucelabs:{}};
  }


  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Build tasks
    babel: {
      options: {
        sourceMap: 'inline',
        presets: ['es2015']
      },
      dist: {
        files: {
          "lib/root.js": "src/root.js",
          "lib/const.js": "src/const.js",
          "lib/logger.js": "src/logger.js",
          "lib/client-utils.js": "src/client-utils.js",
          "lib/xhr.js": "src/xhr.js",
          "lib/client-authenticator.js": "src/client-authenticator.js",
          "lib/client.js": "src/client.js",
          "lib/syncable.js": "src/syncable.js",
          "lib/conversation.js": "src/conversation.js",
          "lib/message-part.js": "src/message-part.js",
          "lib/message.js": "src/message.js",
          "lib/content.js": "src/content.js",
          "lib/query.js": "src/query.js",
          "lib/query-builder.js": "src/query-builder.js",
          "lib/sync-manager.js": "src/sync-manager.js",
          "lib/sync-event.js": "src/sync-event.js",
          "lib/online-state-manager.js": "src/online-state-manager.js",
          "lib/websocket-manager.js": "src/websocket-manager.js",
          "lib/user.js": "src/user.js",
          "lib/layer-error.js": "src/layer-error.js",
          "lib/layer-event.js": "src/layer-event.js",
          "lib/client-registry.js": "src/client-registry.js",
          "lib/typing-indicators/typing-indicators.js": "src/typing-indicators/typing-indicators.js",
          "lib/typing-indicators/typing-indicator-listener.js": "src/typing-indicators/typing-indicator-listener.js",
          "lib/typing-indicators/typing-listener.js": "src/typing-indicators/typing-listener.js",
          "lib/typing-indicators/typing-publisher.js": "src/typing-indicators/typing-publisher.js"
        }
      }
    },
    browserify: {
      options: {
        separator: ';'
      },
      debug: {
        files: {
          'build/client.debug.js': ['index-es6.js']
        },
        options: {
          transform: [['babelify', {
            presets: ['es2015']}]],
          browserifyOptions: {
            standalone: 'layer',
            debug: true
          }
        }
      },
      build: {
        files: {
          'build/client.build.js': ['index-es6.js']
        },
        options: {
          transform: [['babelify', {presets: ['es2015'], sourceMaps: false}]],
          browserifyOptions: {
            standalone: 'layer',
            debug: false
          }
        }
      },
      coverage: {
        files: {
          'coverage/index.js': ['index.js']
        },
        options: {
          transform: [[fixBrowserifyForIstanbul], ["istanbulify"]],
          browserifyOptions: {
            standalone: false,
            debug: false
          }
        }
      }
    },
    remove: {
      build: {
        fileList: ['build/client.build.js']
      }
    },
    uglify: {
    		options: {
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
    				'<%= grunt.template.today("yyyy-mm-dd") %> */ ',
        mangle: {
          except: [
            "layer",
            "Conversation",
            "Message",
            "MessagePart",
            "Client",
            "LayerEvent",
            "LayerError",
            "Content",
            "OnlineStateManager",
            "Query",
            "SyncEvent",
            "SyncManager",
            "User",
            "WebsocketManager"]
        },
        sourceMap: false,
        screwIE8: true
      },
      build: {
        files: {
          'build/client.min.js': ['build/client.build.js']
        }
      }
    },
    watch: {
      debug: {
        files: ['src/**', "Gruntfile.js"],
        tasks: ['debug']
      }
    },

    // Testing and Coverage tasks
    jasmine: {
      options: {
        helpers: ['test/lib/mock-ajax.js', 'test/specs/responses.js', 'test/lib/browser-utils.js'],
        specs: ['test/specs/unit/*Spec.js', 'test/specs/unit/messages/*Spec.js'],
        summary: true
      },
      debug: {
        src: ["build/client.debug.js"]
      },
      coverage: {
        src: ["coverage/index.js"],
        options: {
          summary: false,
          display: "none",
          template: require('grunt-template-jasmine-istanbul'),
          templateOptions: {
            coverage: 'coverage/data/coverage.json',
            ignoreFiles: ["coverage/index.js", "lib/user.js"],
            report: [{ type: "text", options: { dir: 'coverage/report/text' } },
              { type: "html", options: { dir: 'coverage/report' } }]

          }
        }
      }
    },
    // Adds support for the ignoreFiles parameter, which is needed for removing generated files from the result
    copy: {
      fixIstanbul: {
        src: "grunt-template-jasmine-istanbul_src-main-js-template.js",
        dest: "node_modules/grunt-template-jasmine-istanbul/src/main/js/template.js"
      }
    },

    // Documentation
    jsduck: {
      build: {
        src: ["lib/**.js", "lib/typing-indicators/**.js"],
        dest: 'docs',
        options: {
          'builtin-classes': false,
          'warnings': ['-no_doc', '-dup_member', '-link_ambiguous'],
          'external': ['XMLHttpRequest', 'Blob', 'Websocket', 'KeyboardEvent'],
          'title': 'Layer Web SDK - API Documentation',
          'categories': ['jsduck-config/categories.json'],
          'head-html': HTML_HEAD,
          'css': [CSS],
          'footer': 'Layer Web SDK v' + version
        }
      }
    },

    // Saucelabs Tests
    connect: {
			server: {
        options: {
            port: 9023
        }
      }
    },
    'saucelabs-jasmine': {
      debug: {
        options: {
          username: credentials ? credentials.saucelabs.user : '',
          key: credentials ? credentials.saucelabs.pass : '',
          urls: ['http://127.0.0.1:9023/test/SpecRunner.html'],
          testname: 'Web SDK <%= pkg.version %> Unit Test',
          browsers: browsers
        }
      }
    },
  });

  // Building
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-remove');
  grunt.registerTask('debug', ['browserify:debug']);
  grunt.registerTask('build', ['browserify:build', 'uglify', 'remove:build']);
  grunt.registerTask('prepublish', ['babel:dist']);

  // Documentation
  grunt.loadNpmTasks('grunt-jsduck');
  grunt.registerTask('docs', ['babel:dist', 'jsduck']);

  // Testing
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.registerTask('test', ['debug', 'jasmine:debug']);


  // Coverage Tests; warning: First run of grunt coverage will NOT use the copied istanbul fix; only the subsequent runs will.
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.registerTask('coverage', ['copy:fixIstanbul', 'babel:dist', 'browserify:coverage', 'jasmine:coverage']);

  // Saucelabs Tests
  grunt.loadNpmTasks('grunt-saucelabs');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.registerTask('sauce', ['connect', 'saucelabs-jasmine']);
};
