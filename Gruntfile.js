/*eslint-disable */

var fs = require('fs');

var version = require('./package.json').version;

var HTML_HEAD = fs.readFileSync('./jsduck-config/head.html').toString();
var CSS = fs.readFileSync('./jsduck-config/style.css').toString();

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
    "babel": {
      options: {
        sourceMap: false
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
            report: [{ type: "text", options: { dir: 'coverage/report/text' } },
              { type: "html", options: { dir: 'coverage/report' } }],

            // Thresholds can be improved if we test non-babelified code
            thresholds: {
              lines: 75,
              statements: 75,
              branches: 75,
              functions: 90
            }
          }
        }
      }
    },
    browserify: {
      options: {
        separator: ';'
      },
      debug: {
        files: {
          'build/client.build.debug.js': ['index.js']
        },
        options: {
          browserifyOptions: {
            debug: false
          }
        }
      },
      build: {
        files: {
          'build/client.build.js': ['index.js']
        },
        options: {
          browserifyOptions: {
            debug: false
          }
        }
      },
      coverage: {
        files: {
          'coverage/index.js': ['index.js']
        },
        options: {
          transform: ["istanbulify"]
        }
      }
    },
    remove: {
      debug: {
        fileList: ['build/client.build.debug.js']
      },
      build: {
        fileList: ['build/client.build.js', 'build/client.umd.js']
      }
    },
    watch: {
      debug: {
        files: ['src/**', "Gruntfile.js"],
        tasks: ['debug']
      }
    },
    copy: {
      fixIstanbul: {
        src: "grunt-template-jasmine-istanbul_src-main-js-template.js",
        dest: "node_modules/grunt-template-jasmine-istanbul/src/main/js/template.js"
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
          'build/client.min.js': ['build/client.umd.js']
        }
      }
    },
    umd: {
      debug: {
        options: {
          src: 'build/client.build.debug.js',
          dest: 'build/client.debug.js',
          objectToExport: 'layer'
        }
      },
      build: {
        options: {
          src: 'build/client.build.js',
          dest: 'build/client.umd.js',
          objectToExport: 'layer'
        }
      },
    },
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

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-jsduck');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-umd');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-saucelabs');
  grunt.loadNpmTasks('grunt-remove');

  grunt.registerTask('test', ['debug', 'jasmine:debug']);
  grunt.registerTask('docs', ['browserify:build', 'jsduck']);
  grunt.registerTask('debug', ['babel:dist', 'browserify:debug', 'umd:debug', 'remove:debug']);
  grunt.registerTask('build', ['babel:dist', 'browserify:build', 'umd:build', 'uglify', 'remove:build']);
  grunt.registerTask('coverage', ['copy:fixIstanbul', 'babel:dist', 'browserify:coverage', 'jasmine:coverage']);
	grunt.registerTask('sauce', ['connect', 'saucelabs-jasmine']);
};
