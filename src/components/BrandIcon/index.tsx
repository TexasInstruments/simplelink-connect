import createIconSetFromFontello from '@react-native-vector-icons/fontello';
import fontelloConfig from '../../assets/fonts/brands_font_config.json';
import { BrandIconName } from '../../../types';

const Icon = createIconSetFromFontello(
  fontelloConfig, { fontSource: 'brands.ttf' }
);

interface Props {
  name: BrandIconName;
  size?: number;
  color?: string;
}

const BrandIcon: React.FC<Props> = ({ name, size, color }) => {
  return <Icon name={name} size={size ? size : 16} color={color ? color : "black"} />;
};

export default BrandIcon;
