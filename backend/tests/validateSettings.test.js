const fs = require('fs');
const path = require('path');
const { validateSettings } = require('../utils/validateSettings');

describe('validateSettings', () => {
  const validPath = '../config/settings.json';

  test('successfully validates default settings', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    expect(() => validateSettings(validPath)).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  test('throws error for missing active_platforms', () => {
    const baseFile = path.resolve(__dirname, "../config/settings.json");
    const data = JSON.parse(fs.readFileSync(baseFile, 'utf-8'));
    delete data.active_platforms;
    const tempPathRel = '../tests/temp-invalid-settings.json';
    const tempPath = path.resolve(__dirname, 'temp-invalid-settings.json');
    fs.writeFileSync(tempPath, JSON.stringify(data));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    expect(() => validateSettings(tempPathRel)).toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    fs.unlinkSync(tempPath);
  });
});
