// .eslintrc.js
module.exports = {
    extends: ['plugin:vue/recommended', 'plugin:prettier-vue/recommended'],

    settings: {
        'prettier-vue': {
            SFCBlocks: {
                customBlocks: {
                    // Treat the `<docs>` block as a `.markdown` file
                    docs: { lang: 'markdown' },

                    // Treat the `<config>` block as a `.json` file
                    config: { lang: 'json' },

                    // Treat the `<module>` block as a `.js` file
                    module: { lang: 'js' },

                    // Ignore `<comments>` block (omit it or set it to `false` to ignore the block)
                    comments: false,
                },
            },
        },
    },

    rules: {},
};
