import { FC } from "react";
import { cn } from "../lib/utils.ts";

interface WholeContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const WholeContainer: FC<WholeContainerProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "app-shell inset-0 relative flex w-full min-h-[560px] max-h-[720px] justify-center overflow-y-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default WholeContainer;
