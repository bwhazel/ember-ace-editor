import Ember from 'ember';

const { $, RSVP, computed, on, run } = Ember;

export default Ember.Component.extend({

  /* Options */

  editorApiBaseUrl: 'https://cdn.jsdelivr.net/ace',
  editorApiVersion: '1.2.0',
  language: 'css',
  tabSize: 2,
  theme: 'monokai',

  /* Properties */

  classNames: ['ace-editor'],
  editor: null,

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
    const { editorApiBaseUrl, editorApiVersion, language, theme } = this.getProperties(
      [ 'editorApiBaseUrl', 'editorApiVersion', 'language', 'theme' ]
    );
    const baseUrl = `${editorApiBaseUrl}/${editorApiVersion}`;
    const getScriptPromises = [];

    ['ace', `mode-${language}`, `theme-${theme}`].forEach((fileName) => {
      const promise = this.getScript(`${baseUrl}/noconflict/${fileName}.js`);

      getScriptPromises.push(promise);
    });

    RSVP.allSettled(getScriptPromises).then(() => {
      run.later(this, function() {
        this.renderEditor();
      }, 2000);
    }).catch(() => {
      this.flashMessage('error', 'Sorry, the editor is not available at this time');
    });
  }),

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

      this.set('editor', editor);
    });
  },

  teardownEditor: on('willDestroyElement', function() {
    const editor = this.get('editor');

    if (editor) {
      editor.destroy();
    }
  }),

});
