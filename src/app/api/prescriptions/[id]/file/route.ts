import { requireUser } from "@/lib/auth";
import { AppError, jsonError } from "@/lib/http";
import { ADMIN_DASHBOARD_ROLES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getPrivateObject } from "@/lib/storage";

function getPrescriptionFileExtension(mimeType: string) {
  if (mimeType === "application/pdf") {
    return "pdf";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  return "jpg";
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(bytes);

  return arrayBuffer;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const rx = await prisma.prescription.findUnique({
      where: {
        id,
      },
    });

    if (!rx) {
      throw new AppError(404, "NOT_FOUND", "Prescription not found");
    }

    if (
      rx.userId !== user.id &&
      !ADMIN_DASHBOARD_ROLES.includes(user.role)
    ) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "You cannot view this prescription"
      );
    }

    const bytes = await getPrivateObject(rx.fileKey);
    const body = toArrayBuffer(bytes);
    const extension = getPrescriptionFileExtension(rx.mimeType);

    return new Response(body, {
      headers: {
        "content-type": rx.mimeType,
        "content-disposition": `inline; filename="prescription.${extension}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}