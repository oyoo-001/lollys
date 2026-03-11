// utils/image.js
export const getCloudinaryUrl = (url, width) => {
  if (!url || !url.includes('/upload/')) {
    return url || "";
  }

  // Define the desired transformations for responsive delivery.
  // f_auto: Automatically selects the best image format (e.g., WebP, AVIF).
  // q_auto: Automatically adjusts quality to balance file size and visual fidelity.
  // dpr_auto: Automatically delivers the correct device pixel ratio version for retina/HD screens.
  // w_{width}: Resizes the image to the specified width.
  // c_limit: Ensures the image is not scaled up beyond its original dimensions, preventing pixelation.
  const transformations = `f_auto,q_auto,dpr_auto,w_${width},c_limit`;

  // Split the URL at the /upload/ part to safely insert transformations.
  // This is more robust than simple string replacement.
  const parts = url.split('/upload/');

  // Reconstruct the URL with transformations.
  // Example: .../upload/v12345/image.jpg -> .../upload/f_auto,q_auto.../v12345/image.jpg
  return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};