package com.levelup.trainingarc;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;
import android.content.Context;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import org.junit.Test;

public class RunImageExporterTest {
    private final Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();

    @Test public void savesReadablePublishedPngToPictures() throws Exception {
        assumeTrue(Build.VERSION.SDK_INT >= 29);
        Bitmap original = Bitmap.createBitmap(32, 48, Bitmap.Config.ARGB_8888);
        original.eraseColor(Color.GREEN);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        assertTrue(original.compress(Bitmap.CompressFormat.PNG, 100, bytes));
        original.recycle();
        Uri saved = RunImageExporter.save(context, "level-up-export-test-" + System.currentTimeMillis() + ".png", bytes.toByteArray());
        try {
            assertNotNull(saved);
            try (Cursor cursor = context.getContentResolver().query(saved,
                new String[] { MediaStore.Images.Media.MIME_TYPE, MediaStore.Images.Media.IS_PENDING, MediaStore.Images.Media.RELATIVE_PATH }, null, null, null)) {
                assertNotNull(cursor);
                assertTrue(cursor.moveToFirst());
                assertEquals("image/png", cursor.getString(0));
                assertEquals(0, cursor.getInt(1));
                assertTrue(cursor.getString(2).startsWith("Pictures/Level Up"));
            }
            try (InputStream input = context.getContentResolver().openInputStream(saved)) {
                Bitmap decoded = BitmapFactory.decodeStream(input);
                assertNotNull(decoded);
                assertEquals(32, decoded.getWidth());
                assertEquals(48, decoded.getHeight());
                assertEquals(Color.GREEN, decoded.getPixel(0, 0));
                decoded.recycle();
            }
        } finally { context.getContentResolver().delete(saved, null, null); }
    }

    @Test(expected = IOException.class) public void rejectsInvalidPngBeforeCreatingAFile() throws Exception {
        assumeTrue(Build.VERSION.SDK_INT >= 29);
        RunImageExporter.save(context, "invalid-export-test.png", new byte[] { 1, 2, 3 });
    }
}