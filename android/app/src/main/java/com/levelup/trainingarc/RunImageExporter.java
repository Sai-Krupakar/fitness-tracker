package com.levelup.trainingarc;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import java.io.IOException;
import java.io.OutputStream;

final class RunImageExporter {
    private RunImageExporter() {}

    static Uri save(Context context, String filename, byte[] image) throws IOException {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(image, 0, image.length, bounds);
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0 || !"image/png".equals(bounds.outMimeType)) {
            throw new IOException("Run image is not a valid PNG");
        }
        ContentResolver resolver = context.getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Level Up");
        values.put(MediaStore.Images.Media.IS_PENDING, 1);
        Uri destination = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (destination == null) throw new IOException("Could not create an image in Pictures/Level Up");
        try {
            try (OutputStream output = resolver.openOutputStream(destination, "w")) {
                if (output == null) throw new IOException("Could not open the saved image");
                output.write(image);
                output.flush();
            }
            ContentValues published = new ContentValues();
            published.put(MediaStore.Images.Media.IS_PENDING, 0);
            if (resolver.update(destination, published, null, null) != 1) throw new IOException("Could not publish the saved image");
            return destination;
        } catch (IOException | RuntimeException error) {
            try { resolver.delete(destination, null, null); } catch (RuntimeException cleanupError) { error.addSuppressed(cleanupError); }
            throw error;
        }
    }
}