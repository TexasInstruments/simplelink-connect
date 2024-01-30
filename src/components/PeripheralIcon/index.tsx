import { Icon } from '@rneui/themed';
import BrandIcon from '../BrandIcon';
import { BrandIconName } from '../../../types';

interface Props {
  icon:
  | {
    name: string;
    type?: 'material' | 'font-awesome' | 'brands';
  }
  | undefined
  | null;
  color?: string;
  size?: number;
}

const PeripheralIcon: React.FC<Props> = ({ icon, color, size }) => {
  if (icon?.type === 'brands') {
    return <BrandIcon size={size} name={icon.name as BrandIconName} />;
  }

  return (
    <Icon
      name={icon ? icon.name : 'devices'}
      type={icon?.type ? icon.type : 'material'}
      size={size ? size : 20}
      color={color}
    />
  );
};

export default PeripheralIcon;
