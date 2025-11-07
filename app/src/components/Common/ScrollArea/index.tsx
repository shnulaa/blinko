import i18n from "@/lib/i18n";
import { _ } from "@/lib/lodash";
import { observer } from "mobx-react-lite";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";

type IProps = {
  style?: any;
  className?: any;
  onBottom: () => void;
  onRefresh?: () => Promise<any>;
  children: any;
  pullDownThreshold?: number;
  maxPullDownDistance?: number;
};

export type ScrollAreaHandles = {
  scrollToBottom: () => void;
}

export const ScrollArea = observer(forwardRef<ScrollAreaHandles, IProps>(({ 
  style, 
  className, 
  children, 
  onBottom,
  onRefresh,
  pullDownThreshold = 60,
  maxPullDownDistance = 100
}, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPc = useMediaQuery('(min-width: 768px)');
  
  // Pull to refresh states
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Touch tracking
  const startYRef = useRef(0);
  const canPullRef = useRef(true); // Initialize as true for initial state
  
  let debounceBottom;
  if (onBottom) {
    debounceBottom = _.debounce(onBottom!, 500, { leading: true, trailing: false });
  }

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight;
    },
  }));

  const handleScroll = (e) => {
    const target = e.target;
    const bottom = (target.scrollHeight - target.scrollTop) <= target.clientHeight + 100;
    if (bottom) {
      debounceBottom?.();
    }
    
    // Update can pull state
    canPullRef.current = target.scrollTop === 0;
  };

  const handleTouchStart = (e: TouchEvent | MouseEvent) => {
    if (!onRefresh || isRefreshing) return;
    
    // Check if at top position
    const scrollElement = scrollRef.current;
    if (scrollElement && scrollElement.scrollTop > 0) return;
    
    const clientY = e instanceof TouchEvent ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging || !onRefresh || isRefreshing) return;
    
    const clientY = e instanceof TouchEvent ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startYRef.current;
    
    if (deltaY > 0) {
      e.preventDefault();
      const distance = Math.min(deltaY * 0.5, maxPullDownDistance);
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging || !onRefresh) return;
    
    setIsDragging(false);
    
    if (pullDistance >= pullDownThreshold) {
      setIsRefreshing(true);
      
      try {
        console.log('onRefresh');
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const divElement = scrollRef.current;
    if (!divElement) return;
    
    // Initialize canPull state
    canPullRef.current = divElement.scrollTop === 0;
    
    divElement.addEventListener("scroll", handleScroll);
    
    // Add pull-to-refresh listeners only if onRefresh exists
    if (onRefresh) {
      divElement.addEventListener('touchstart', handleTouchStart, { passive: false });
      divElement.addEventListener('touchmove', handleTouchMove, { passive: false });
      divElement.addEventListener('touchend', handleTouchEnd, { passive: true });
      divElement.addEventListener('mousedown', handleTouchStart);
      divElement.addEventListener('mousemove', handleTouchMove);
      divElement.addEventListener('mouseup', handleTouchEnd);
      divElement.addEventListener('mouseleave', handleTouchEnd);
    }
    
    return () => {
      divElement.removeEventListener("scroll", handleScroll);
      if (onRefresh) {
        divElement.removeEventListener('touchstart', handleTouchStart);
        divElement.removeEventListener('touchmove', handleTouchMove);
        divElement.removeEventListener('touchend', handleTouchEnd);
        divElement.removeEventListener('mousedown', handleTouchStart);
        divElement.removeEventListener('mousemove', handleTouchMove);
        divElement.removeEventListener('mouseup', handleTouchEnd);
        divElement.removeEventListener('mouseleave', handleTouchEnd);
      }
    };
  }, [onRefresh, isRefreshing, isDragging, pullDistance, pullDownThreshold]);

  // Calculate pull progress and arrow rotation
  const pullProgress = Math.min(pullDistance / pullDownThreshold, 1);
  const arrowRotation = pullProgress * 180; // 0 to 180 degrees
  const isReadyToRefresh = pullDistance >= pullDownThreshold;
  
  const showRefreshIndicator = onRefresh && (pullDistance > 0 || isRefreshing);
  const refreshText = isRefreshing 
    ? i18n.t('common.refreshing') 
    : isReadyToRefresh 
      ? i18n.t('common.releaseToRefresh') 
      : i18n.t('common.pullToRefresh');

  // Arrow Icon Component
  const ArrowIcon = () => (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      className={`transition-transform duration-150 ${isDragging ? '' : 'duration-300'}`}
      style={{ 
        transform: `rotate(${arrowRotation}deg)`,
        opacity: pullProgress
      }}
    >
      <path 
        d="M12 5l0 14m-7-7l7-7 7 7" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div
      ref={scrollRef}
      style={{
        ...style,
        paddingTop: showRefreshIndicator ? `${pullDistance}px` : undefined,
        transition: isDragging ? 'none' : 'padding-top 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      className={`${className} overflow-y-scroll overflow-x-hidden ${isPc ? '' : 'scrollbar-hide'} scroll-smooth`}
    >
      {/* Pull to refresh indicator */}
      {showRefreshIndicator && (
        <div 
          className={`flex items-center justify-center transition-all duration-150 ${
            isDragging ? '' : 'duration-300'
          } ${isReadyToRefresh ? 'text-primary' : 'text-gray-500'} ${
            isReadyToRefresh ? 'bg-primary/5' : 'bg-gray-50/80'
          }`}
          style={{
            height: `${pullDistance}px`,
            marginTop: `-${pullDistance}px`,
            opacity: Math.max(pullProgress * 0.8, 0.3),
            backdropFilter: 'blur(8px)'
          }}
        >
          <div className="flex items-center gap-2">
            {isRefreshing ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <ArrowIcon />
            )}
            <span 
              className={`text-sm font-medium transition-all duration-200 ${
                isReadyToRefresh ? 'scale-105' : 'scale-100'
              }`}
              style={{ opacity: Math.max(pullProgress, 0.6) }}
            >
              {refreshText}
            </span>
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}))