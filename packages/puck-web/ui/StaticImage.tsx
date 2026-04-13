interface StaticImageProps {
  path: string;
  title: string;
}

export function StaticImage({ path, title }: StaticImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={path}
      alt={title}
      className="w-full h-full object-cover"
    />
  );
}
