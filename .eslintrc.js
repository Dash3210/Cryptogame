module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // Bitwise operators are intrinsic to the PRNG and Base64 helpers.
      files: ['src/utils/cipher.ts'],
      rules: { 'no-bitwise': 'off' },
    },
  ],
};
