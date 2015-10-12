import Ember from 'ember';

const { $, RSVP, computed, on, run } = Ember;

export default Ember.Component.extend({

  /* Options */

  editorApiBaseUrl: 'https://cdn.jsdelivr.net/ace',
  editorApiVersion: '1.2.0',
  editorDependenciesDidLoad: null, // Action
  editorDidRender: null, // Action
  language: 'css',
  tabSize: 2,
  theme: 'monokai',

  /* Properties */

  classNameBindings: ['loaded'],
  classNames: ['code-editor'],
  editor: null,
  loaded: null,

  baseUrl: computed(function() {
    const { editorApiBaseUrl, editorApiVersion } = this.getProperties(
      [ 'editorApiBaseUrl', 'editorApiVersion' ]
    );

    return `${editorApiBaseUrl}/${editorApiVersion}/noconflict/`;
  }),

  content: computed(function(key, value) {
    const editor = this.get('editor');

    if (editor) {
      if (!value) {
        return editor.getSession().getValue();
      }

      const cursor = editor.getCursorPosition();

      editor.getSession().setValue(value);
      editor.moveCursorToPosition(cursor);
    }

    return value;
  }),

  /* Methods */

  getScript(url) {
    return new RSVP.Promise(function(resolve, reject) {
      $.getScript(url).done(resolve).fail(reject);
    });
  },

  loadEditorApi: on('init', function() {
    const baseUrl = this.get('baseUrl');

    /* Ensure the core library loads before the extras */

    if (!window.ace) {
      this.getScript(`${baseUrl}ace.js`).then(() => {
        this.loadEditorExtras();
      });
    } else {
      this.loadEditorExtras();
    }
  }),

  loadEditorExtras() {
    const { baseUrl, language, theme } = this.getProperties(
      [ 'baseUrl', 'language', 'theme' ]
    );
    const extrasPromises = [];
    const extras = {
      mode: `mode-${language}`,
      theme: `theme-${theme}`,
    };

    Object.keys(extras).forEach((option) => {
      const fileName = extras[option];
      const modulePath = `ace/${option}/${fileName}`;

      /* For each extra required, check if it exists
      (i.e. it has already been loaded)... */

      if (!window.ace.require(modulePath)) {

        /* ... If not, load it, and push the promise
        to an array to track load progress */

        const promise = this.getScript(`${baseUrl}${fileName}.js`);

        extrasPromises.push(promise);
      }
    });

    /* Then, once the extras are finished loading, render
    the editor */

    RSVP.allSettled(extrasPromises).then(() => {
      run.later(this, function() {
        this.sendAction('editorDependenciesDidLoad');
        this.renderEditor();
      }, 2000);
    }).catch(() => {
      this.flashMessage('error', 'Sorry, custom CSS is not available at this time.');
    });
  },

  renderEditor() {
    run.scheduleOnce('render', this, function() {
      const { content, element, language, tabSize, theme } = this.getProperties(
        [ 'content', 'element', 'language', 'tabSize', 'theme' ]
      );

      const ace = window.ace;
      const editor = ace.edit(element);
      const editorSession = editor.getSession();

      editor.setTheme(`ace/theme/${theme}`);
      editor.$blockScrolling = Infinity;
      editor.on('change', () => {
        this.notifyPropertyChange('content');
      });

      editorSession.setMode(`ace/mode/${language}`);
      editorSession.setTabSize(tabSize);
      editorSession.setValue(content);

      this.sendAction('editorDidRender');

      this.set('editor', editor);
      this.set('content', content);

      run.later(this, function() {
        this.set('loaded', true);
      }, 500);
    });
  },

  teardownEditor: on('willDestroyElement', function() {
    const editor = this.get('editor');

    if (editor) {
      editor.destroy();
    }
  }),

});
