import { FC } from "react";
import { cn } from "../lib/utils.ts";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Container: FC<ContainerProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-[386px] flex-col overflow-y-hidden px-4 py-3.5",
        className
      )}
    >
      {children}
    </div>
  );
};

export default Container;
