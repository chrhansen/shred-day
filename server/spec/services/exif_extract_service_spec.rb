require 'rails_helper'

RSpec.describe ExifExtractService do
  let(:user) { create(:user) } # Photo belongs_to user
  let(:photo_import) { create(:photo_import, user: user) } # Photo belongs_to photo_import

  # Helper to create a photo with an attached file
  def create_photo_with_attachment(filename)
    create(:photo,
           user: user,
           photo_import: photo_import,
           image: fixture_file_upload(filename, 'image/jpeg'))
  end

  describe '#extract_from_file' do
    context 'when the image has full EXIF data (DateTime and GPS)' do
      # This test ideally uses a real image with known EXIF, or complex Vips stubbing
      # For simplicity, we'll stub Vips::Image#get calls
      let(:photo) { create_photo_with_attachment('test_image_with_full_exif.jpg') } # Assume this file exists

      it 'extracts taken_at, latitude, and longitude' do
        described_class.new(photo).extract_from_file
        photo.reload

        expect(photo.taken_at).to be_a(Time)
        expect(photo.taken_at.strftime("%Y:%m:%d %H:%M:%S")).to eq("2024:12:13 09:25:22")

        # Expected decimal values for the example DMS strings above
        # 47 + 18/60 + 8.35/3600 = 47.302319...
        # 11 + 23/60 + 14.89/3600 = 11.387469...
        expect(photo.latitude).to be_within(0.0001).of(47.18275)
        expect(photo.longitude).to be_within(0.0001).of(11.2910)
      end

      it 'sets exif_state to :extracted' do
        described_class.new(photo).extract_from_file
        photo.reload
        expect(photo.exif_state_extracted?).to be true
      end

      it 'returns a successful result' do
        result = described_class.new(photo).extract_from_file
        expect(result).to be_extracted
        expect(result.photo).to eq(photo)
      end
    end

    context 'when the image has only DateTime EXIF data (no GPS)' do
      let(:photo) { create_photo_with_attachment('test_image_with_datetime_exif.jpg') } # Assume this file exists
      let(:vips_image_double) { instance_double(Vips::Image) }
      let(:expected_time_str) { "2023:11:15 09:45:10" }

      before do
        photo.image.blob.analyze
        allow(Vips::Image).to receive(:new_from_file).and_return(vips_image_double)
        allow(vips_image_double).to receive(:get).with("exif-ifd0-DateTime").and_return(expected_time_str)
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLatitude").and_return(nil) # No GPS
        # ... stub other GPS fields to return nil ...
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLatitudeRef").and_return(nil)
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLongitude").and_return(nil)
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLongitudeRef").and_return(nil)

      end

      it 'extracts taken_at but latitude and longitude remain nil' do
        described_class.new(photo).extract_from_file
        photo.reload
        expect(photo.taken_at.strftime("%Y:%m:%d %H:%M:%S")).to eq(expected_time_str)
        expect(photo.latitude).to be_nil
        expect(photo.longitude).to be_nil
      end

      it 'sets exif_state to :missing' do
        described_class.new(photo).extract_from_file
        photo.reload
        expect(photo.exif_state_missing?).to be true
      end

      it 'returns an unsuccessful result for extraction (as not all key data found)' do
        result = described_class.new(photo).extract_from_file
        expect(result).not_to be_extracted # Because GPS was missing for :extracted state
      end
    end

    context 'when the image has no relevant EXIF data' do
      let(:photo) { create_photo_with_attachment('test_image_no_exif.jpg') } # Assume this file exists
      let(:vips_image_double) { instance_double(Vips::Image) }

      before do
        photo.image.blob.analyze
        allow(Vips::Image).to receive(:new_from_file).and_return(vips_image_double)
        # Stub all relevant EXIF fields to return nil
        allow(vips_image_double).to receive(:get).with("exif-ifd0-DateTime").and_return(nil)
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLatitude").and_return(nil)
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLatitudeRef").and_return(nil)
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLongitude").and_return(nil)
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLongitudeRef").and_return(nil)
      end

      it 'does not set taken_at, latitude, or longitude' do
        described_class.new(photo).extract_from_file
        photo.reload
        expect(photo.taken_at).to be_nil
        expect(photo.latitude).to be_nil
        expect(photo.longitude).to be_nil
      end

      it 'sets exif_state to :missing' do
        described_class.new(photo).extract_from_file
        photo.reload
        expect(photo.exif_state_missing?).to be true
      end

      it 'returns an unsuccessful result for extraction' do
        result = described_class.new(photo).extract_from_file
        expect(result).not_to be_extracted
      end
    end

    context 'when Vips::Image.get raises an error (e.g., tag not found and not rescued by safe_get)' do
      let(:photo) { create_photo_with_attachment('test_image_no_exif.jpg') }
      let(:vips_image_double) { instance_double(Vips::Image) }

      before do
        photo.image.blob.analyze
        allow(Vips::Image).to receive(:new_from_file).and_return(vips_image_double)
        # Simulate `safe_get` still failing for some reason or an unexpected error
        allow(vips_image_double).to receive(:get).with("exif-ifd0-DateTime").and_raise(Vips::Error.new("Simulated Vips Error"))
        # Ensure other gets return nil so it doesn't succeed due to them
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLatitude").and_return(nil)
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLatitudeRef").and_return(nil)
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLongitude").and_return(nil)
        allow(vips_image_double).to receive(:get).with("exif-ifd3-GPSLongitudeRef").and_return(nil)
      end

      it 'gracefully handles the error, sets exif_state to :missing, and does not crash' do
        expect {
          described_class.new(photo).extract_from_file
        }.not_to raise_error # Due to your safe_get, it should not raise

        photo.reload
        expect(photo.exif_state_missing?).to be true
        expect(photo.taken_at).to be_nil
      end
    end

    context 'dms_to_decimal helper method (private method, test via public interface or directly if desired)' do
      # Instance of the service to call the private method (not ideal, but for demonstration)
      # Better to test this with real EXIF data through the public `extract_from_file`
      let(:service_instance) { described_class.new(build_stubbed(:photo)) }

      it 'correctly converts N latitude' do
        decimal = service_instance.send(:dms_to_decimal, "47/1, 18/1, 835/100", "N")
        expect(decimal).to be_within(0.0001).of(47.302319)
      end
      it 'correctly converts S latitude' do
        decimal = service_instance.send(:dms_to_decimal, "34/1, 5/1, 0/1", "S") # 34° 5' 0" S
        expect(decimal).to be_within(0.0001).of(-34.083333)
      end
      it 'correctly converts E longitude' do
        decimal = service_instance.send(:dms_to_decimal, "11/1, 23/1, 1489/100", "E")
        expect(decimal).to be_within(0.0001).of(11.387469)
      end
      it 'correctly converts W longitude' do
        decimal = service_instance.send(:dms_to_decimal, "70/1, 0/1, 0/1", "W") # 70° 0' 0" W
        expect(decimal).to be_within(0.0001).of(-70.0)
      end
      it 'handles rational strings with spaces and commas' do
        decimal = service_instance.send(:dms_to_decimal, "50/1 7/1 3031/100", "N") # Space separated
        expect(decimal).to be_within(0.0001).of(50.125083)
        decimal = service_instance.send(:dms_to_decimal, "50/1,7/1,3031/100", "N") # Comma separated, no space
        expect(decimal).to be_within(0.0001).of(50.125083)
      end
       it 'returns nil for malformed DMS string (less than 3 parts)' do
        decimal = service_instance.send(:dms_to_decimal, "50/1, 7/1", "N")
        expect(decimal).to be_nil
      end
    end
  end
end
