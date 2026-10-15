import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TextEncoder } from "node:util";
import { Paths } from "expo-file-system";
import { photoForm } from "../lib/photo-upload";

const { installFormDataPatch } = jest.requireActual("../../node_modules/expo/src/winter/FormData");
const { convertFormDataAsync } = jest.requireActual("../../node_modules/expo/src/winter/fetch/convertFormData");
const nativeFormData = jest.requireActual("react-native/Libraries/Network/FormData").default;
const originalFormData = global.FormData;
const originalTextEncoder = global.TextEncoder;

beforeAll(() => {
  global.FormData = installFormDataPatch(nativeFormData);
  global.TextEncoder = TextEncoder;
});
afterAll(() => {
  global.FormData = originalFormData;
  global.TextEncoder = originalTextEncoder;
});

test.each([
  ["jpg", "image/jpeg", "file"],
  ["heic", "image/heic", "file"],
  ["png", "image/png", "user[avatar]"],
])("SDK 57 multipart includes the selected %s bytes and %s type", async (extension, mimeType, field) => {
  const name = `test_image.${extension}`;
  const bytes = readFileSync(join(__dirname, "../../../server/spec/fixtures/files", name));
  const selectedFile = Paths.cache.createFile(name, mimeType);
  selectedFile.write(new Uint8Array(bytes));
  const form = photoForm({
    uri: selectedFile.uri, width: 10, height: 10, fileName: name, mimeType,
  }, field);

  const { body, boundary } = await convertFormDataAsync(form);
  const encoded = Buffer.from(body);
  const headers = encoded.subarray(0, encoded.indexOf("\r\n\r\n")).toString();
  expect(headers).toContain(`name="${field}"; filename="${name}"`);
  expect(headers).toContain(`content-type: ${mimeType}`);
  expect(encoded.includes(bytes)).toBe(true);
  expect(encoded.subarray(-boundary.length - 6).toString()).toBe(`--${boundary}--\r\n`);
});
