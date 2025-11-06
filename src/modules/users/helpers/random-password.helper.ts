/**
 * Random Password Generator
 * ==========================
 * Generates random alphanumeric passwords.
 * 
 * Based on old backend: src/helpers/common.ts -> randomPassGenerator
 */

/**
 * Generate Random Password
 * =========================
 * Generates a random alphanumeric password of specified length.
 * 
 * @param length - Length of password to generate
 * @returns Random alphanumeric string
 */
export function randomPassGenerator(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}
